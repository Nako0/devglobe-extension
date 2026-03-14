'use strict';

const SUPABASE_URL = 'https://kzcrtlbspkhlnjillhyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk';
const FETCH_TIMEOUT = 15_000;
const OFFLINE_THRESHOLD = 2;

let _consecutiveFailures = 0;

async function sendHeartbeat(apiKey, language, geo) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        p_key: apiKey,
        p_lang: language || 'Unknown',
        p_city: geo ? geo.city : null,
        p_lat: geo ? geo.lat : null,
        p_lng: geo ? geo.lng : null,
        p_editor: 'Zed',
        p_anonymous: false,
        p_share_repo: false,
        p_repo: null,
      }),
    });

    if (res.ok) {
      _consecutiveFailures = 0;
      const data = await res.json();
      return { ok: true, todaySeconds: data?.today_seconds ?? 0 };
    }
    _consecutiveFailures++;
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    _consecutiveFailures++;
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

function isOffline() {
  return _consecutiveFailures >= OFFLINE_THRESHOLD;
}

module.exports = { sendHeartbeat, isOffline };
