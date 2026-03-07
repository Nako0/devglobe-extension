package xyz.devglobe.plugin

import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.StartupActivity
import xyz.devglobe.plugin.auth.ApiKeyStorage
import xyz.devglobe.plugin.core.DevGlobeTracker
import xyz.devglobe.plugin.settings.DevGlobeSettings

/**
 * Runs once per project open.
 * Initializes the tracker if an API key is stored and tracking is enabled.
 * Since the tracker is application-level (singleton), multiple project opens
 * are safe — the tracker ignores redundant start() calls.
 */
class DevGlobeStartupActivity : StartupActivity.DumbAware {

    override fun runActivity(project: Project) {
        val apiKey = ApiKeyStorage.get() ?: return
        val settings = DevGlobeSettings.getInstance()
        val tracker = DevGlobeTracker.getInstance()

        // Skip if already tracking (another project triggered startup)
        if (tracker.getState().tracking) return

        if (settings.state.trackingEnabled) {
            tracker.start(apiKey)
        } else {
            tracker.restoreConnected(apiKey)
        }
    }
}
