package xyz.devglobe.plugin.core

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.editor.EditorFactory
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import xyz.devglobe.plugin.auth.ApiKeyStorage
import xyz.devglobe.plugin.settings.DevGlobeSettings
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

class DevGlobeTracker : Disposable {

    private val LOG = Logger.getInstance(DevGlobeTracker::class.java)

    private var state = TrackerState()
    private var scheduler: ScheduledExecutorService? = null
    private var heartbeatTask: ScheduledFuture<*>? = null
    private var currentApiKey: String? = null

    @Volatile private var lastActivity = 0L
    private val ticking = AtomicBoolean(false)
    private var consecutiveNetErrors = 0
    private var last5xxWarning = 0L

    private var documentListener: DocumentListener? = null
    private val stateListeners = CopyOnWriteArrayList<(TrackerState) -> Unit>()

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    fun getState(): TrackerState = state.copy()

    fun addStateListener(listener: (TrackerState) -> Unit) {
        stateListeners.add(listener)
    }

    fun removeStateListener(listener: (TrackerState) -> Unit) {
        stateListeners.remove(listener)
    }

    fun recordActivity() {
        lastActivity = System.currentTimeMillis()
    }

    fun start(apiKey: String) {
        clearTimer()
        currentApiKey = apiKey
        consecutiveNetErrors = 0

        val settings = DevGlobeSettings.getInstance()
        state = state.copy(
            connected = true,
            tracking = true,
            offline = false,
            shareRepo = settings.state.shareRepo,
            statusMessage = settings.state.statusMessage,
        )
        pushState()
        lastActivity = System.currentTimeMillis()

        registerDocumentListener()

        scheduler = Executors.newSingleThreadScheduledExecutor { r ->
            Thread(r, "DevGlobe-Heartbeat").apply { isDaemon = true }
        }
        heartbeatTask = scheduler!!.scheduleAtFixedRate({
            if (System.currentTimeMillis() - lastActivity > Constants.ACTIVITY_TIMEOUT_MS) return@scheduleAtFixedRate
            tick(apiKey)
        }, 0, Constants.HEARTBEAT_INTERVAL_MS, TimeUnit.MILLISECONDS)
    }

    fun pause() {
        clearTimer()
        state = state.copy(tracking = false)
        pushState()
    }

    fun stop() {
        pause()
        currentApiKey = null
        state = state.copy(connected = false)
        pushState()
    }

    fun reset() {
        stop()
        state = TrackerState()
        pushState()
    }

    fun restoreConnected(apiKey: String) {
        currentApiKey = apiKey
        val settings = DevGlobeSettings.getInstance()
        state = state.copy(
            connected = true,
            tracking = false,
            shareRepo = settings.state.shareRepo,
            statusMessage = settings.state.statusMessage,
        )
        pushState()
    }

    fun setStatusMessage(message: String) {
        state = state.copy(statusMessage = message)
        pushState()
    }

    fun updatePreference(key: String, value: Boolean) {
        state = when (key) {
            "shareRepo" -> state.copy(shareRepo = value)
            else -> state
        }
        pushState()
    }

    fun handleNetworkRestored() {
        if (!state.offline || !state.tracking) return
        consecutiveNetErrors = 0
        state = state.copy(offline = false)
        LOG.info("Network restored — tracking resumed")
        pushState()
        notify("Network restored — tracking resumed", NotificationType.INFORMATION)
        if (currentApiKey != null && System.currentTimeMillis() - lastActivity <= Constants.ACTIVITY_TIMEOUT_MS) {
            tick(currentApiKey!!)
        }
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    private fun tick(apiKey: String) {
        if (!ticking.compareAndSet(false, true)) return

        try {
            val project = LanguageService.getFocusedProject()
            val result = HeartbeatService.sendHeartbeat(apiKey, project)

            consecutiveNetErrors = 0
            if (state.offline) {
                state = state.copy(offline = false)
                LOG.info("Network restored — tracking resumed")
                notify("Network restored — tracking resumed", NotificationType.INFORMATION)
            }

            state = state.copy(
                codingTime = formatTime(result.todaySeconds),
                language = result.language,
            )
            pushState()
        } catch (e: NetworkError) {
            consecutiveNetErrors++
            LOG.warn("Network error #$consecutiveNetErrors: ${e.message}")
            if (consecutiveNetErrors >= Constants.OFFLINE_THRESHOLD && !state.offline) {
                state = state.copy(offline = true)
                pushState()
                notify("No network — tracking paused", NotificationType.WARNING)
            }
        } catch (e: ApiError) {
            LOG.error("Heartbeat API error (${e.status}): ${e.message}")
            if (e.status >= 500 && System.currentTimeMillis() - last5xxWarning > Constants.WARNING_THROTTLE_MS) {
                last5xxWarning = System.currentTimeMillis()
                notify("Server error — will retry", NotificationType.WARNING)
            }
        } catch (e: Exception) {
            LOG.error("Heartbeat failed: ${e.message}")
        } finally {
            ticking.set(false)
        }
    }

    private fun registerDocumentListener() {
        if (documentListener != null) return
        documentListener = object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) {
                lastActivity = System.currentTimeMillis()
            }
        }
        EditorFactory.getInstance().eventMulticaster.addDocumentListener(documentListener!!, this)
    }

    private fun clearTimer() {
        heartbeatTask?.cancel(false)
        heartbeatTask = null
        scheduler?.shutdown()
        scheduler = null
    }

    private fun pushState() {
        val snapshot = state.copy()
        ApplicationManager.getApplication().invokeLater {
            for (listener in stateListeners) {
                listener(snapshot)
            }
        }
    }

    private fun notify(message: String, type: NotificationType) {
        ApplicationManager.getApplication().invokeLater {
            NotificationGroupManager.getInstance()
                .getNotificationGroup("DevGlobe")
                .createNotification("DevGlobe", message, type)
                .notify(null)
        }
    }

    override fun dispose() {
        clearTimer()
    }

    companion object {
        fun getInstance(): DevGlobeTracker =
            ApplicationManager.getApplication().getService(DevGlobeTracker::class.java)

        private fun formatTime(totalSeconds: Int): String {
            val h = totalSeconds / 3600
            val m = (totalSeconds % 3600) / 60
            return if (h > 0) "${h}h ${m}m" else "${m}m"
        }
    }
}
