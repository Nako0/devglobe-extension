package xyz.devglobe.plugin.ui

import com.intellij.ide.BrowserUtil
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import xyz.devglobe.plugin.auth.ApiKeyStorage
import xyz.devglobe.plugin.core.DevGlobeTracker
import xyz.devglobe.plugin.core.HeartbeatService
import xyz.devglobe.plugin.core.TrackerState
import xyz.devglobe.plugin.settings.DevGlobeSettings
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class SidebarFactory : ToolWindowFactory, DumbAware {

    companion object {
        private val executor: ExecutorService = Executors.newSingleThreadExecutor { r ->
            Thread(r, "DevGlobe-Sidebar").apply { isDaemon = true }
        }
    }

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val tracker = DevGlobeTracker.getInstance()
        val panel = SidebarPanel()

        panel.listener = object : SidebarListener {
            override fun onConnect(apiKey: String) {
                if (!apiKey.startsWith("devglobe_")) {
                    notify(project, "Invalid API key — it should start with \"devglobe_\".", NotificationType.ERROR)
                    return
                }
                ApiKeyStorage.set(apiKey)
                tracker.restoreConnected(apiKey)
                notify(project, "Connected! Click \"Start Tracking\" to go live.", NotificationType.INFORMATION)
            }

            override fun onDisconnect() {
                ApiKeyStorage.clear()
                tracker.reset()
                notify(project, "Disconnected.", NotificationType.INFORMATION)
            }

            override fun onStartTracking() {
                val apiKey = ApiKeyStorage.get() ?: return
                val settings = DevGlobeSettings.getInstance()
                settings.state.trackingEnabled = true
                tracker.start(apiKey)
                notify(project, "Tracking started.", NotificationType.INFORMATION)
            }

            override fun onStopTracking() {
                val settings = DevGlobeSettings.getInstance()
                settings.state.trackingEnabled = false
                tracker.pause()
                notify(project, "Tracking stopped.", NotificationType.INFORMATION)
            }

            override fun onSetStatus(message: String) {
                val apiKey = ApiKeyStorage.get() ?: return
                executor.submit {
                    val ok = HeartbeatService.updateStatusMessage(apiKey, message)
                    com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                        if (ok) {
                            tracker.setStatusMessage(message)
                            val settings = DevGlobeSettings.getInstance()
                            settings.state.statusMessage = message
                            val text = if (message.isNotEmpty()) "Status set to \"$message\"" else "Status cleared"
                            notify(project, text, NotificationType.INFORMATION)
                        } else {
                            notify(project, "Failed to update status.", NotificationType.ERROR)
                        }
                    }
                }
            }

            override fun onToggleShareRepo(enabled: Boolean) {
                val settings = DevGlobeSettings.getInstance()
                settings.state.shareRepo = enabled
                tracker.updatePreference("shareRepo", enabled)
            }

            override fun onToggleAnonymousMode(enabled: Boolean) {
                val settings = DevGlobeSettings.getInstance()
                settings.state.anonymousMode = enabled
                tracker.updatePreference("anonymousMode", enabled)
            }

            override fun onOpenExternal(url: String) {
                BrowserUtil.browse(url)
            }
        }

        // Listen for state changes
        val stateListener: (TrackerState) -> Unit = { state -> panel.updateState(state) }
        tracker.addStateListener(stateListener)

        // Push initial state
        panel.updateState(tracker.getState())

        // Remove listener when tool window is disposed
        com.intellij.openapi.util.Disposer.register(toolWindow.disposable) {
            tracker.removeStateListener(stateListener)
        }

        val content = ContentFactory.getInstance().createContent(panel, "", false)
        toolWindow.contentManager.addContent(content)
    }

    private fun notify(project: Project, message: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("DevGlobe")
            .createNotification("DevGlobe", message, type)
            .notify(project)
    }
}
