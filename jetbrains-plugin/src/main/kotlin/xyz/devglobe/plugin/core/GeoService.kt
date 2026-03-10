package xyz.devglobe.plugin.core

import com.google.gson.JsonParser
import com.google.gson.reflect.TypeToken
import com.google.gson.Gson
import com.intellij.openapi.diagnostic.Logger
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.text.Normalizer
import java.time.Duration
import kotlin.math.roundToInt

data class GeoResult(
    val city: String?,
    val lat: Double,
    val lon: Double,
    val countryCode: String? = null,
    val countryName: String? = null,
)

object GeoService {

    private val LOG = Logger.getInstance(GeoService::class.java)
    private val client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(Constants.GEO_TIMEOUT_SECONDS))
        .build()

    @Volatile private var cached: GeoResult? = null
    @Volatile private var lastFetch = 0L

    // Anonymous mode: cached per-session
    @Volatile private var cachedAnonymous: GeoResult? = null
    @Volatile private var cityCentersDb: Map<String, Map<String, List<Number>>>? = null

    fun fetch(anonymous: Boolean = false): GeoResult? {
        if (cached != null && System.currentTimeMillis() - lastFetch < Constants.GEO_CACHE_TTL_MS) {
            return if (anonymous) getAnonymousLocation(cached!!) else cached
        }

        val result = fromFreeIpApi() ?: fromIpApiCo()
        if (result == null) {
            LOG.warn("Geolocation: both providers failed")
            return if (anonymous && cached != null) getAnonymousLocation(cached!!) else cached
        }

        if (cached != null && cached!!.city != result.city && result.city != null) {
            LOG.info("City changed: ${cached!!.city} -> ${result.city}")
        }

        cached = result
        lastFetch = System.currentTimeMillis()
        return if (anonymous) getAnonymousLocation(cached!!) else cached
    }

    /** Clears the cached anonymous location so the next heartbeat picks a new random city. */
    fun resetAnonymousLocation() {
        cachedAnonymous = null
    }

    // -------------------------------------------------------------------------
    // Anonymous mode
    // -------------------------------------------------------------------------

    private fun titleCase(s: String): String {
        return s.replace(Regex("(?:^|[\\s-])\\S")) { it.value.uppercase() }
    }

    private fun getAnonymousLocation(geo: GeoResult): GeoResult? {
        val code = geo.countryCode?.uppercase() ?: ""

        // Reuse cached anonymous location if same country
        if (cachedAnonymous != null && cachedAnonymous!!.countryCode == code) {
            return cachedAnonymous!!
        }

        val country = loadCityCenters()[code]
        val keys = country?.keys?.toList() ?: emptyList()

        if (keys.isEmpty()) return null

        val key = keys.random()
        val center = country!![key]!!
        val lat = center[0].toDouble()
        val lon = center[1].toDouble()
        val displayName = titleCase(key)
        val displayCity = if (geo.countryName != null) "$displayName, ${geo.countryName}" else displayName

        cachedAnonymous = GeoResult(displayCity, lat, lon, code, geo.countryName)
        return cachedAnonymous!!
    }

    // -------------------------------------------------------------------------
    // City center snapping (152k+ cities from GeoNames)
    // -------------------------------------------------------------------------

    private fun normalizeCity(name: String): String {
        val nfd = Normalizer.normalize(name, Normalizer.Form.NFD)
        return nfd.replace(Regex("[\\u0300-\\u036f]"), "").lowercase()
    }

    /** Snaps coordinates to canonical city center. Falls back to round1 if not found. */
    private fun snapToCity(cityName: String?, countryCode: String?, lat: Double, lon: Double): Pair<Double, Double> {
        if (cityName != null && countryCode != null) {
            val country = loadCityCenters()[countryCode.uppercase()]
            if (country != null) {
                val center = country[normalizeCity(cityName)]
                if (center != null && center.size >= 2) {
                    return Pair(center[0].toDouble(), center[1].toDouble())
                }
            }
        }
        // Fallback: random point within a 20km radius circle
        val angle = Math.random() * 2 * Math.PI
        val r = Math.sqrt(Math.random()) * 0.18 // 20km ≈ 0.18°
        val dLat = r * Math.cos(angle)
        val dLon = r * Math.sin(angle) / Math.cos(lat * Math.PI / 180)
        return Pair(round1(lat + dLat), round1(lon + dLon))
    }

    private fun loadCityCenters(): Map<String, Map<String, List<Number>>> {
        if (cityCentersDb != null) return cityCentersDb!!
        return try {
            val stream = GeoService::class.java.getResourceAsStream("/data/city-centers.json")
            val json = stream?.bufferedReader()?.readText() ?: "{}"
            val type = object : TypeToken<Map<String, Map<String, List<Number>>>>() {}.type
            cityCentersDb = Gson().fromJson(json, type)
            cityCentersDb!!
        } catch (e: Exception) {
            LOG.warn("Failed to load city centers: ${e.message}")
            emptyMap()
        }
    }

    // -------------------------------------------------------------------------
    // Geo providers
    // -------------------------------------------------------------------------

    private fun round1(n: Double): Double = (n * 10).roundToInt() / 10.0

    private fun validCoords(lat: Double, lon: Double): Boolean =
        lat in -90.0..90.0 && lon in -180.0..180.0

    private fun fetchJson(url: String): String? {
        return try {
            val req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(Constants.GEO_TIMEOUT_SECONDS))
                .GET()
                .build()
            val res = client.send(req, HttpResponse.BodyHandlers.ofString())
            if (res.statusCode() != 200) null else res.body()
        } catch (e: Exception) {
            null
        }
    }

    private fun fromFreeIpApi(): GeoResult? {
        val body = fetchJson("https://free.freeipapi.com/api/json") ?: return null
        return try {
            val obj = JsonParser.parseString(body).asJsonObject
            val lat = obj.get("latitude")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble ?: return null
            val lon = obj.get("longitude")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble ?: return null
            if (!validCoords(lat, lon)) return null

            val cityName = obj.get("cityName")?.takeIf { it.isJsonPrimitive }?.asString
            val countryName = obj.get("countryName")?.takeIf { it.isJsonPrimitive }?.asString
            val countryCode = obj.get("countryCode")?.takeIf { it.isJsonPrimitive }?.asString
            val city = when {
                cityName != null && countryName != null -> "$cityName, $countryName"
                else -> cityName ?: countryName
            }
            val (snappedLat, snappedLon) = snapToCity(cityName, countryCode, lat, lon)
            GeoResult(city, snappedLat, snappedLon, countryCode, countryName)
        } catch (e: Exception) {
            null
        }
    }

    private fun fromIpApiCo(): GeoResult? {
        val body = fetchJson("https://ipapi.co/json/") ?: return null
        return try {
            val obj = JsonParser.parseString(body).asJsonObject
            val lat = obj.get("latitude")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble ?: return null
            val lon = obj.get("longitude")?.takeIf { it.isJsonPrimitive && it.asJsonPrimitive.isNumber }?.asDouble ?: return null
            if (!validCoords(lat, lon)) return null

            val cityName = obj.get("city")?.takeIf { it.isJsonPrimitive }?.asString
            val countryName = obj.get("country_name")?.takeIf { it.isJsonPrimitive }?.asString
            val countryCode = obj.get("country_code")?.takeIf { it.isJsonPrimitive }?.asString
            val city = when {
                cityName != null && countryName != null -> "$cityName, $countryName"
                else -> cityName ?: countryName
            }
            val (snappedLat, snappedLon) = snapToCity(cityName, countryCode, lat, lon)
            GeoResult(city, snappedLat, snappedLon, countryCode, countryName)
        } catch (e: Exception) {
            null
        }
    }
}
