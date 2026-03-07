package xyz.devglobe.plugin.core

import com.google.gson.JsonParser
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
)

object GeoService {

    private val LOG = Logger.getInstance(GeoService::class.java)
    private val client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(Constants.GEO_TIMEOUT_SECONDS))
        .build()

    private var cached: GeoResult? = null
    private var lastFetch = 0L

    fun fetch(): GeoResult? {
        if (cached != null && System.currentTimeMillis() - lastFetch < Constants.GEO_CACHE_TTL_MS) {
            return cached
        }

        val result = fromFreeIpApi() ?: fromIpApiCo()
        if (result == null) {
            LOG.warn("Geolocation: both providers failed")
            return cached
        }

        if (cached != null && cached!!.city != result.city && result.city != null) {
            LOG.info("City changed: ${cached!!.city} -> ${result.city}")
        }

        cached = result
        lastFetch = System.currentTimeMillis()
        return cached
    }

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
            val city = when {
                cityName != null && countryName != null -> "$cityName, $countryName"
                else -> cityName ?: countryName
            }
            GeoResult(city, round1(lat), round1(lon))
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
            val city = when {
                cityName != null && countryName != null -> "$cityName, $countryName"
                else -> cityName ?: countryName
            }
            GeoResult(city, round1(lat), round1(lon))
        } catch (e: Exception) {
            null
        }
    }
}
