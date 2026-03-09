package xyz.devglobe.plugin.core

import com.google.gson.JsonParser
import com.google.gson.reflect.TypeToken
import com.google.gson.Gson
import com.intellij.openapi.diagnostic.Logger
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
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

    private var cached: GeoResult? = null
    private var lastFetch = 0L

    // Anonymous mode: cached per-session
    private var cachedAnonymous: GeoResult? = null
    private var anonymousCities: Map<String, List<List<Any>>>? = null

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

    private fun getAnonymousLocation(geo: GeoResult): GeoResult {
        val code = geo.countryCode?.uppercase() ?: ""

        // Reuse cached anonymous location if same country
        if (cachedAnonymous != null && cachedAnonymous!!.countryCode == code) {
            return cachedAnonymous!!
        }

        val cities = loadAnonymousCities()[code]

        if (cities != null && cities.isNotEmpty()) {
            val pick = cities.random()
            val lat = (pick[0] as Number).toDouble()
            val lon = (pick[1] as Number).toDouble()
            val cityName = pick[2] as String
            val displayCity = if (geo.countryName != null) "$cityName, ${geo.countryName}" else cityName

            cachedAnonymous = GeoResult(displayCity, lat, lon, code, geo.countryName)
        } else {
            // Fallback: random offset ±1-2°
            val offsetLat = (Math.random() - 0.5) * 4
            val offsetLon = (Math.random() - 0.5) * 4
            cachedAnonymous = GeoResult(
                city = geo.countryName,
                lat = round1(geo.lat + offsetLat),
                lon = round1(geo.lon + offsetLon),
                countryCode = code,
                countryName = geo.countryName,
            )
        }

        return cachedAnonymous!!
    }

    private fun loadAnonymousCities(): Map<String, List<List<Any>>> {
        if (anonymousCities != null) return anonymousCities!!
        return try {
            val stream = GeoService::class.java.getResourceAsStream("/data/anonymous-cities.json")
            val json = stream?.bufferedReader()?.readText() ?: "{}"
            val type = object : TypeToken<Map<String, List<List<Any>>>>() {}.type
            anonymousCities = Gson().fromJson(json, type)
            anonymousCities!!
        } catch (e: Exception) {
            LOG.warn("Failed to load anonymous cities: ${e.message}")
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
        val body = fetchJson("https://freeipapi.com/api/json") ?: return null
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
            GeoResult(city, round1(lat), round1(lon), countryCode, countryName)
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
            GeoResult(city, round1(lat), round1(lon), countryCode, countryName)
        } catch (e: Exception) {
            null
        }
    }
}
