package xyz.devglobe.plugin.core

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import xyz.devglobe.plugin.settings.DevGlobeSettings
import java.io.File
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.atomic.AtomicBoolean

class DevGlobeTracker : Disposable {

    private val LOG = Logger.getInstance(DevGlobeTracker::class.java)

    @Volatile private var state = TrackerState()
    private var coreClient: CoreClient? = null
    private var currentApiKey: String? = null
    private val started = AtomicBoolean(false)
    private var documentListener: DocumentListener? = null
    private val stateListeners = CopyOnWriteArrayList<(TrackerState) -> Unit>()

    fun getState(): TrackerState = state.copy()

    fun addStateListener(listener: (TrackerState) -> Unit) {
        stateListeners.add(listener)
    }

    fun removeStateListener(listener: (TrackerState) -> Unit) {
        stateListeners.remove(listener)
    }

    fun start(apiKey: String) {
        started.set(true)
        currentApiKey = apiKey
        val settings = DevGlobeSettings.getInstance()

        ensureCore()
        coreClient?.sendInit(apiKey, settings.state.shareRepo, settings.state.anonymousMode, settings.state.statusMessage)
        coreClient?.sendResume()

        registerDocumentListener()
    }

    fun pause() {
        coreClient?.sendPause()
        state = state.copy(tracking = false)
        pushState()
    }

    fun stop() {
        started.set(false)
        pause()
        currentApiKey = null
        state = state.copy(connected = false)
        pushState()
    }

    fun reset() {
        started.set(false)
        coreClient?.sendShutdown()
        coreClient?.dispose()
        coreClient = null
        currentApiKey = null
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
            anonymousMode = settings.state.anonymousMode,
            statusMessage = settings.state.statusMessage,
        )
        pushState()
    }

    fun setStatusMessage(message: String) {
        state = state.copy(statusMessage = message)
        pushState()
    }

    fun sendSetStatus(message: String) {
        ensureCore()
        coreClient?.sendSetStatus(message)
    }

    fun updatePreference(key: String, value: Boolean) {
        state = when (key) {
            "shareRepo" -> state.copy(shareRepo = value)
            "anonymousMode" -> state.copy(anonymousMode = value)
            else -> state
        }
        pushState()

        when (key) {
            "shareRepo" -> coreClient?.sendSetConfig(shareRepo = value, anonymousMode = null)
            "anonymousMode" -> coreClient?.sendSetConfig(shareRepo = null, anonymousMode = value)
        }
    }

    private fun ensureCore() {
        if (coreClient != null) return

        if (!CoreDownloader.isInstalled()) {
            LOG.info("devglobe-core not found, downloading...")
            notify("Downloading devglobe-core...", NotificationType.INFORMATION)

            val ok = CoreDownloader.download()
            if (!ok) {
                CoreDownloader.notifyDownloadFailed()
                return
            }
            notify("devglobe-core downloaded successfully", NotificationType.INFORMATION)
        }

        val client = CoreClient(CoreDownloader.getBinaryPath())
        client.onState = { newState ->
            state = newState
            pushState()
        }
        client.onOffline = { msg ->
            notify(msg, NotificationType.WARNING)
        }
        client.onOnline = { msg ->
            notify(msg, NotificationType.INFORMATION)
        }
        client.onStatusOk = { msg ->
            val text = if (msg.isNotEmpty()) "Status set to \"$msg\"" else "Status cleared"
            notify(text, NotificationType.INFORMATION)
        }
        client.onStatusError = { msg ->
            notify(msg, NotificationType.ERROR)
        }
        client.start()
        coreClient = client
    }

    private fun registerDocumentListener() {
        if (documentListener != null) return
        documentListener = object : DocumentListener {
            override fun documentChanged(event: DocumentEvent) {
                val project = LanguageService.getFocusedProject() ?: return
                val editor = FileEditorManager.getInstance(project).selectedTextEditor ?: return
                val file = editor.virtualFile ?: return
                val filePath = file.path
                val cwd = File(filePath).parent ?: return
                val language = file.fileType.name

                coreClient?.sendActivity(filePath, cwd, language)
            }
        }
        EditorFactory.getInstance().eventMulticaster.addDocumentListener(documentListener!!, this)
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
        coreClient?.dispose()
        coreClient = null
    }

    companion object {
        fun getInstance(): DevGlobeTracker =
            ApplicationManager.getApplication().getService(DevGlobeTracker::class.java)
    }
}
