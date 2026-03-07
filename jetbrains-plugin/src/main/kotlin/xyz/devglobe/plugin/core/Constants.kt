package xyz.devglobe.plugin.core

object Constants {
    const val SUPABASE_URL = "https://kzcrtlbspkhlnjillhyz.supabase.co"

    // The anon key is public by Supabase design — real protection comes from RLS policies.
    const val SUPABASE_ANON_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk"

    const val HEARTBEAT_INTERVAL_MS = 30_000L
    const val ACTIVITY_TIMEOUT_MS = 60_000L
    const val GEO_CACHE_TTL_MS = 3_600_000L
    const val GIT_CACHE_TTL_MS = 300_000L
    const val FETCH_TIMEOUT_SECONDS = 15L
    const val GEO_TIMEOUT_SECONDS = 10L
    const val OFFLINE_THRESHOLD = 2
    const val WARNING_THROTTLE_MS = 120_000L
}
