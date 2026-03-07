package xyz.devglobe.plugin.core

data class TrackerState(
    val connected: Boolean = false,
    val tracking: Boolean = false,
    val codingTime: String = "0m",
    val language: String? = null,
    val shareRepo: Boolean = false,
    val statusMessage: String = "",
    val offline: Boolean = false,
)
