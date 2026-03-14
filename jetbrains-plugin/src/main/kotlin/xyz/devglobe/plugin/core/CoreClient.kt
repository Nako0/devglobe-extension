package xyz.devglobe.plugin.core

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.application.ApplicationManager
import com.intellij.util.PlatformUtils
import java.io.BufferedReader
import java.io.BufferedWriter
import java.io.InputStreamReader
import java.io.OutputStreamWriter

class CoreClient(private val binaryPath: String) : Disposable {

    private val LOG = Logger.getInstance(CoreClient::class.java)

    private var process: Process? = null
    private var writer: BufferedWriter? = null
    private var readerThread: Thread? = null

    var onState: ((TrackerState) -> Unit)? = null
    var onHeartbeatOk: ((Int, String?) -> Unit)? = null
    var onOffline: ((String) -> Unit)? = null
    var onOnline: ((String) -> Unit)? = null
    var onStatusOk: ((String) -> Unit)? = null
    var onStatusError: ((String) -> Unit)? = null

    fun start() {
        if (process != null) return
        try {
            val pb = ProcessBuilder(binaryPath, "daemon")
                .redirectErrorStream(false)
            process = pb.start()
            writer = BufferedWriter(OutputStreamWriter(process!!.outputStream, Charsets.UTF_8))

            readerThread = Thread({
                try {
                    val reader = BufferedReader(InputStreamReader(process!!.inputStream, Charsets.UTF_8))
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        handleLine(line!!)
                    }
                } catch (_: Exception) {
                    // process closed
                }
            }, "DevGlobe-CoreReader").apply {
                isDaemon = true
                start()
            }

            LOG.info("Core daemon started: $binaryPath")
        } catch (e: Exception) {
            LOG.error("Failed to start core daemon: ${e.message}")
        }
    }

    fun sendInit(apiKey: String, shareRepo: Boolean, anonymousMode: Boolean, statusMessage: String) {
        val params = JsonObject().apply {
            addProperty("api_key", apiKey)
            addProperty("editor", detectEditor())
            addProperty("share_repo", shareRepo)
            addProperty("anonymous_mode", anonymousMode)
            addProperty("status_message", statusMessage)
        }
        send("init", params)
    }

    fun sendActivity(filePath: String, cwd: String, language: String?) {
        val params = JsonObject().apply {
            addProperty("file_path", filePath)
            addProperty("cwd", cwd)
            language?.let { addProperty("language", it) }
        }
        send("activity", params)
    }

    fun sendSetConfig(shareRepo: Boolean?, anonymousMode: Boolean?) {
        val params = JsonObject().apply {
            shareRepo?.let { addProperty("share_repo", it) }
            anonymousMode?.let { addProperty("anonymous_mode", it) }
        }
        send("set_config", params)
    }

    fun sendSetStatus(message: String) {
        val params = JsonObject().apply {
            addProperty("message", message)
        }
        send("set_status", params)
    }

    fun sendPause() = send("pause", null)
    fun sendResume() = send("resume", null)
    fun sendShutdown() = send("shutdown", null)

    private fun send(method: String, params: JsonObject?) {
        try {
            val msg = JsonObject().apply {
                addProperty("method", method)
                if (params != null) add("params", params)
            }
            writer?.write(msg.toString())
            writer?.newLine()
            writer?.flush()
        } catch (e: Exception) {
            LOG.warn("Failed to send to core: ${e.message}")
        }
    }

    private fun handleLine(line: String) {
        try {
            val obj = JsonParser.parseString(line).asJsonObject
            val event = obj.get("event")?.asString ?: return
            val data = obj.getAsJsonObject("data") ?: return

            ApplicationManager.getApplication().invokeLater {
                when (event) {
                    "state" -> {
                        val state = TrackerState(
                            connected = data.get("connected")?.asBoolean ?: false,
                            tracking = data.get("tracking")?.asBoolean ?: false,
                            codingTime = data.get("coding_time")?.asString ?: "0m",
                            language = data.get("language")?.takeIf { !it.isJsonNull }?.asString,
                            shareRepo = data.get("share_repo")?.asBoolean ?: false,
                            anonymousMode = data.get("anonymous_mode")?.asBoolean ?: false,
                            statusMessage = data.get("status_message")?.asString ?: "",
                            offline = data.get("offline")?.asBoolean ?: false,
                        )
                        onState?.invoke(state)
                    }
                    "heartbeat_ok" -> {
                        val todaySeconds = data.get("today_seconds")?.asInt ?: 0
                        val language = data.get("language")?.takeIf { !it.isJsonNull }?.asString
                        onHeartbeatOk?.invoke(todaySeconds, language)
                    }
                    "offline" -> onOffline?.invoke(data.get("message")?.asString ?: "")
                    "online" -> onOnline?.invoke(data.get("message")?.asString ?: "")
                    "status_ok" -> onStatusOk?.invoke(data.get("message")?.asString ?: "")
                    "status_error" -> onStatusError?.invoke(data.get("message")?.asString ?: "")
                }
            }
        } catch (e: Exception) {
            LOG.warn("Failed to parse core event: ${e.message}")
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

    override fun dispose() {
        try {
            sendShutdown()
            process?.waitFor(2, java.util.concurrent.TimeUnit.SECONDS)
        } catch (_: Exception) { }
        process?.destroyForcibly()
        process = null
        writer = null
    }
}
