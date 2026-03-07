export const SUPABASE_URL = 'https://kzcrtlbspkhlnjillhyz.supabase.co';
// The anon key is public by Supabase design — safe to ship in client code.
// Real protection comes from RLS policies server-side.
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk';

/** How often a heartbeat is sent while the user is active. */
export const HEARTBEAT_INTERVAL = 30 * 1000; // 30 seconds

/** Stop sending heartbeats if no keystroke was detected within this window. */
export const ACTIVITY_TIMEOUT = 1 * 60 * 1000; // 1 minute

/** How long geolocation is cached before re-fetching. */
export const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * How many consecutive network failures must occur before the extension
 * considers itself offline. This avoids false positives on startup.
 */
export const OFFLINE_THRESHOLD = 2;

/** Fetch timeout for Supabase API calls. */
export const FETCH_TIMEOUT_MS = 15_000;

/** Fetch timeout for geolocation. */
export const GEO_TIMEOUT_MS = 10_000;
