package xyz.devglobe.plugin.core

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import xyz.devglobe.plugin.settings.DevGlobeSettings
import com.intellij.util.PlatformUtils
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

class NetworkError(message: String) : Exception(message)
class ApiError(val status: Int, body: String) : Exception("HTTP $status: $body")

data class HeartbeatResult(
    val todaySeconds: Int,
    val language: String?,
)

object HeartbeatService {

    private val LOG = Logger.getInstance(HeartbeatService::class.java)
    private val client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(Constants.FETCH_TIMEOUT_SECONDS))
        .build()

    /**
     * Sends a heartbeat to the DevGlobe backend.
     * @throws NetworkError if the request could not be made.
     * @throws ApiError if the server returns a non-2xx response.
     */
    fun sendHeartbeat(apiKey: String, project: Project?): HeartbeatResult {
        val settings = DevGlobeSettings.getInstance()
        val geo = GeoService.fetch(anonymous = settings.state.anonymousMode)
        val language = LanguageService.getActiveLanguage()
        val repo = project?.let { GitService.detectRepo(it) }

        val json = JsonObject().apply {
            addProperty("p_key", apiKey)
            addProperty("p_editor", detectEditor())
            addProperty("p_anonymous", settings.state.anonymousMode)

            if (geo != null) {
                geo.city?.let { addProperty("p_city", it) }
                addProperty("p_lat", geo.lat)
                addProperty("p_lng", geo.lon)
            }

            language?.let { addProperty("p_lang", it) }

            if (repo != null && settings.state.shareRepo) {
                addProperty("p_repo", repo)
                addProperty("p_share_repo", true)
            }
        }

        LOG.debug("Sending heartbeat: ${json.deepCopy().apply { remove("p_key") }}")

        val response: HttpResponse<String>
        try {
            val req = HttpRequest.newBuilder()
                .uri(URI.create("${Constants.SUPABASE_URL}/functions/v1/heartbeat"))
                .timeout(Duration.ofSeconds(Constants.FETCH_TIMEOUT_SECONDS))
                .header("Content-Type", "application/json")
                .header("apikey", Constants.SUPABASE_ANON_KEY)
                .header("Authorization", "Bearer ${Constants.SUPABASE_ANON_KEY}")
                .POST(HttpRequest.BodyPublishers.ofString(json.toString()))
                .build()
            response = client.send(req, HttpResponse.BodyHandlers.ofString())
        } catch (e: Exception) {
            throw NetworkError(e.message ?: "Network error")
        }

        if (response.statusCode() !in 200..299) {
            throw ApiError(response.statusCode(), response.body() ?: "")
        }

        val data = try {
            JsonParser.parseString(response.body()).asJsonObject
        } catch (_: Exception) {
            JsonObject()
        }
        val todaySeconds = data.get("today_seconds")?.asInt ?: 0

        return HeartbeatResult(todaySeconds, language)
    }

    /**
     * Updates the user's status message.
     * Returns true on success.
     */
    fun updateStatusMessage(apiKey: String, message: String): Boolean {
        return try {
            val json = JsonObject().apply {
                addProperty("p_key", apiKey)
                addProperty("p_message", message)
            }
            val req = HttpRequest.newBuilder()
                .uri(URI.create("${Constants.SUPABASE_URL}/rest/v1/rpc/update_status_message"))
                .timeout(Duration.ofSeconds(Constants.FETCH_TIMEOUT_SECONDS))
                .header("Content-Type", "application/json")
                .header("apikey", Constants.SUPABASE_ANON_KEY)
                .header("Authorization", "Bearer ${Constants.SUPABASE_ANON_KEY}")
                .POST(HttpRequest.BodyPublishers.ofString(json.toString()))
                .build()
            val res = client.send(req, HttpResponse.BodyHandlers.ofString())
            res.statusCode() in 200..299
        } catch (e: Exception) {
            false
        }
    }

    private fun detectEditor(): String {
        val prefix = PlatformUtils.getPlatformPrefix()
        return when {
            prefix.equals("idea", ignoreCase = true) || prefix == "IdeaEdu" -> "intellij"
            prefix == "WebStorm" -> "webstorm"
            prefix == "Python" || prefix == "PyCharmCore" || prefix == "PyCharmEdu" -> "pycharm"
            prefix == "GoLand" -> "goland"
            prefix == "PhpStorm" -> "phpstorm"
            prefix == "Ruby" -> "rubymine"
            prefix == "CLion" -> "clion"
            prefix == "Rider" -> "rider"
            prefix == "DataGrip" -> "datagrip"
            prefix == "AndroidStudio" -> "android-studio"
            prefix == "RustRover" -> "rustrover"
            else -> "jetbrains"
        }
    }
}
