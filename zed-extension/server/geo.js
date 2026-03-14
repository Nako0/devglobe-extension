'use strict';

const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const GEO_TIMEOUT = 10_000;

let _cache = null;
let _cacheTime = 0;

const GEO_APIS = [
  'https://free.freeipapi.com/api/json',
  'https://ipapi.co/json/',
];

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGeolocation() {
  const now = Date.now();
  if (_cache && (now - _cacheTime) < GEO_CACHE_TTL) return _cache;

  for (const url of GEO_APIS) {
    try {
      const data = await fetchWithTimeout(url, GEO_TIMEOUT);
      const city = data.cityName || data.city || null;
      const lat = data.latitude || data.lat || null;
      const lng = data.longitude || data.lon || null;
      const country = data.countryCode || data.country_code || null;
      if (lat != null && lng != null) {
        _cache = { city, lat, lng, country };
        _cacheTime = now;
        return _cache;
      }
    } catch {
      // try next API
    }
  }
  return null;
}

module.exports = { fetchGeolocation };
