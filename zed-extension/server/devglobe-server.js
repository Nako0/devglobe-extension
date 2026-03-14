'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { startWatching, stopWatching, isActive, getLanguage } = require('./activity');
const { sendHeartbeat, isOffline } = require('./heartbeat');
const { fetchGeolocation } = require('./geo');

const HEARTBEAT_INTERVAL = 30_000;

function readApiKey() {
  // 1. Environment variable
  const envKey = process.env.DEVGLOBE_API_KEY;
  if (envKey && envKey.startsWith('devglobe_')) return envKey.trim();

  // 2. File ~/.devglobe/api_key
  const keyPath = path.join(os.homedir(), '.devglobe', 'api_key');
  try {
    const key = fs.readFileSync(keyPath, 'utf-8').trim();
    if (key.startsWith('devglobe_')) return key;
  } catch {
    // file not found
  }
  return null;
}

async function main() {
  const apiKey = readApiKey();
  if (!apiKey) {
    console.error('[DevGlobe] No API key found. Set DEVGLOBE_API_KEY or create ~/.devglobe/api_key');
    // Keep process alive — Zed expects the MCP server to stay running
    process.stdin.resume();
    return;
  }

  const cwd = process.cwd();
  console.error(`[DevGlobe] Starting heartbeat tracker for ${cwd}`);

  // Start file watcher
  startWatching(cwd);

  // Initial geolocation fetch
  let geo = await fetchGeolocation();
  if (geo) {
    console.error(`[DevGlobe] Location: ${geo.city} (${geo.lat}, ${geo.lng})`);
  } else {
    console.error('[DevGlobe] Geolocation failed — heartbeats will be skipped until resolved');
  }

  // Heartbeat loop
  const timer = setInterval(async () => {
    if (!isActive()) return;

    // Refresh geo if cache expired
    if (!geo) geo = await fetchGeolocation();
    if (!geo) return; // still no location — skip

    const language = getLanguage();
    const result = await sendHeartbeat(apiKey, language, geo);

    if (result.ok) {
      console.error(`[DevGlobe] Heartbeat sent: ${language || 'Unknown'} (${Math.floor(result.todaySeconds / 60)}min today)`);
    } else if (isOffline()) {
      console.error(`[DevGlobe] Offline: ${result.error}`);
    }
  }, HEARTBEAT_INTERVAL);

  // Graceful shutdown
  const shutdown = () => {
    clearInterval(timer);
    stopWatching();
    console.error('[DevGlobe] Shutdown.');
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Keep process alive (Zed communicates via stdio)
  process.stdin.resume();
  process.stdin.on('end', shutdown);
}

main().catch((err) => {
  console.error(`[DevGlobe] Fatal: ${err.message}`);
  process.exit(1);
});
