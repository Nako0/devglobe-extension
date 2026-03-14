package xyz.devglobe.plugin.core

import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger
import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration

object CoreDownloader {

    private val LOG = Logger.getInstance(CoreDownloader::class.java)

    const val CORE_VERSION = "1.0.0"

    private val BASE_URL = "https://github.com/Nako0/devglobe-extension/releases/download/core-v$CORE_VERSION"

    fun getBinaryPath(): String {
        val dir = File(System.getProperty("user.home"), ".devglobe/bin")
        val name = "devglobe-core-$CORE_VERSION"
        return File(dir, name).absolutePath
    }

    fun isInstalled(): Boolean = File(getBinaryPath()).canExecute()

    fun download(): Boolean {
        val platform = detectPlatform() ?: run {
            LOG.warn("Unsupported platform for devglobe-core binary")
            return false
        }

        val url = "$BASE_URL/devglobe-core-$platform"
        val target = File(getBinaryPath())
        target.parentFile.mkdirs()

        LOG.info("Downloading devglobe-core from $url")

        return try {
            val client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(30))
                .build()
            val req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofMinutes(2))
                .GET()
                .build()
            val res = client.send(req, HttpResponse.BodyHandlers.ofFile(target.toPath()))

            if (res.statusCode() in 200..299) {
                target.setExecutable(true)
                LOG.info("devglobe-core downloaded successfully")
                true
            } else {
                LOG.warn("Failed to download devglobe-core: HTTP ${res.statusCode()}")
                target.delete()
                false
            }
        } catch (e: Exception) {
            LOG.warn("Failed to download devglobe-core: ${e.message}")
            target.delete()
            false
        }
    }

    fun notifyDownloadFailed() {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("DevGlobe")
            .createNotification(
                "DevGlobe",
                "Failed to download devglobe-core binary. You can download it manually from GitHub Releases and place it at ${getBinaryPath()}",
                NotificationType.WARNING,
            )
            .notify(null)
    }

    private fun detectPlatform(): String? {
        val os = System.getProperty("os.name").lowercase()
        val arch = System.getProperty("os.arch").lowercase()

        val osName = when {
            os.contains("mac") || os.contains("darwin") -> "darwin"
            os.contains("linux") -> "linux"
            os.contains("win") -> "win"
            else -> return null
        }

        val archName = when {
            arch == "aarch64" || arch == "arm64" -> "arm64"
            arch == "amd64" || arch == "x86_64" -> "x64"
            else -> return null
        }

        return "$osName-$archName"
    }
}
