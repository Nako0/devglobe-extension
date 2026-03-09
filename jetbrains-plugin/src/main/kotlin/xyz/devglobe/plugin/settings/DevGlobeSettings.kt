package xyz.devglobe.plugin.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage

@State(name = "DevGlobeSettings", storages = [Storage("devglobe.xml")])
class DevGlobeSettings : PersistentStateComponent<DevGlobeSettings.State> {

    data class State(
        var trackingEnabled: Boolean = true,
        var shareRepo: Boolean = false,
        var anonymousMode: Boolean = false,
        var statusMessage: String = "",
    )

    private var myState = State()

    override fun getState(): State = myState

    override fun loadState(state: State) {
        myState = state
    }

    companion object {
        fun getInstance(): DevGlobeSettings =
            ApplicationManager.getApplication().getService(DevGlobeSettings::class.java)
    }
}
