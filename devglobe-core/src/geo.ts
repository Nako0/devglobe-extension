import { request as httpsRequest } from 'https';
import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { GEO_CACHE_TTL, GEO_TIMEOUT_MS } from './constants.js';
import type { GeoResult, GeoResultWithTimestamp, AnonCache } from './types.js';

import cityCenters from '../data/city-centers.json';

type CityCentersMap = Record<string, Record<string, [number, number]>>;

const GEO_CACHE_PATH = join(tmpdir(), 'devglobe-geo-cache.json');
const ANON_CACHE_PATH = join(tmpdir(), 'devglobe-anon-location.json');

let memCached: GeoResult | null = null;
let memCachedAnonymous: GeoResult | null = null;
let memLastFetch = 0;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function normalizeCity(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function snapToCity(
  cityName: string | null | undefined,
  countryCode: string | null | undefined,
  lat: number,
  lon: number,
): [number, number] {
  if (cityName && countryCode) {
    const country = (cityCenters as unknown as CityCentersMap)[countryCode.toUpperCase()];
    if (country) {
      const center = country[normalizeCity(cityName)];
      if (center) return center;
    }
  }
  const angle = Math.random() * 2 * Math.PI;
  const r = Math.sqrt(Math.random()) * 0.18;
  const dLat = r * Math.cos(angle);
  const dLon = r * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
  return [round1(lat + dLat), round1(lon + dLon)];
}

function validCoords(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function fetchJson(url: string): Promise<unknown | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      req.destroy();
      resolve(null);
    }, GEO_TIMEOUT_MS);

    const req = httpsRequest(url, { timeout: GEO_TIMEOUT_MS } as object, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
          catch { resolve(null); }
        } else { resolve(null); }
      });
    });
    req.on('error', () => { clearTimeout(timer); resolve(null); });
    req.end();
  });
}

async function fromFreeIpApi(): Promise<GeoResult | null> {
  const data = await fetchJson('https://free.freeipapi.com/api/json') as {
    cityName?: string; countryName?: string; countryCode?: string;
    latitude?: unknown; longitude?: unknown;
  } | null;
  if (!data) return null;

  const lat = typeof data.latitude === 'number' ? data.latitude : null;
  const lon = typeof data.longitude === 'number' ? data.longitude : null;
  if (lat == null || lon == null || !validCoords(lat, lon)) return null;

  const city = data.cityName && data.countryName
    ? `${data.cityName}, ${data.countryName}`
    : (data.cityName ?? data.countryName ?? null);

  const [snappedLat, snappedLon] = snapToCity(data.cityName, data.countryCode, lat, lon);
  return { city, lat: snappedLat, lon: snappedLon, countryCode: data.countryCode ?? null, countryName: data.countryName ?? null };
}

async function fromIpApiCo(): Promise<GeoResult | null> {
  const data = await fetchJson('https://ipapi.co/json/') as {
    city?: string; country_name?: string; country_code?: string;
    latitude?: unknown; longitude?: unknown;
  } | null;
  if (!data) return null;

  const lat = typeof data.latitude === 'number' ? data.latitude : null;
  const lon = typeof data.longitude === 'number' ? data.longitude : null;
  if (lat == null || lon == null || !validCoords(lat, lon)) return null;

  const city = data.city && data.country_name
    ? `${data.city}, ${data.country_name}`
    : (data.city ?? data.country_name ?? null);

  const [snappedLat, snappedLon] = snapToCity(data.city, data.country_code, lat, lon);
  return { city, lat: snappedLat, lon: snappedLon, countryCode: data.country_code ?? null, countryName: data.country_name ?? null };
}

function titleCase(s: string): string {
  return s.replace(/(?:^|[\s-])\S/g, (c) => c.toUpperCase());
}

function getAnonymousLocationMemory(geo: GeoResult): GeoResult {
  if (memCachedAnonymous && memCachedAnonymous.countryCode === geo.countryCode) {
    return memCachedAnonymous;
  }

  const code = geo.countryCode?.toUpperCase() ?? '';
  const country = (cityCenters as unknown as CityCentersMap)[code];
  const keys = country ? Object.keys(country) : [];

  if (keys.length > 0) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    const [lat, lon] = country[key];
    const displayName = titleCase(key);
    memCachedAnonymous = {
      city: geo.countryName ? `${displayName}, ${geo.countryName}` : displayName,
      lat, lon, countryCode: geo.countryCode, countryName: geo.countryName,
    };
  } else {
    memCachedAnonymous = { city: null, lat: null, lon: null, countryCode: geo.countryCode, countryName: geo.countryName };
  }

  return memCachedAnonymous;
}

export function resetAnonymousLocation(): void {
  memCachedAnonymous = null;
}

export async function fetchGeolocation(anonymous = false): Promise<GeoResult | null> {
  if (memCached && Date.now() - memLastFetch < GEO_CACHE_TTL) {
    return anonymous ? getAnonymousLocationMemory(memCached) : memCached;
  }

  const next = await fromFreeIpApi() ?? await fromIpApiCo();
  if (!next) {
    return memCached ? (anonymous ? getAnonymousLocationMemory(memCached) : memCached) : null;
  }

  memCached = next;
  memLastFetch = Date.now();
  return anonymous ? getAnonymousLocationMemory(memCached) : memCached;
}

// ── File-based cache for one-shot mode ────────────────────────────────

export async function fetchGeolocationFile(anonymous = false, sessionId?: string): Promise<GeoResult | null> {
  try {
    const raw: GeoResultWithTimestamp = JSON.parse(readFileSync(GEO_CACHE_PATH, 'utf-8'));
    if (raw.fetchedAt && Date.now() - raw.fetchedAt < GEO_CACHE_TTL) {
      const geo: GeoResult = { city: raw.city, lat: raw.lat, lon: raw.lon, countryCode: raw.countryCode, countryName: raw.countryName };
      return anonymous && sessionId ? getAnonymousLocationFile(geo, sessionId) : geo;
    }
  } catch { /* no cache */ }

  const next = await fromFreeIpApi() ?? await fromIpApiCo();
  if (!next) return null;

  try {
    const cached: GeoResultWithTimestamp = { ...next, fetchedAt: Date.now() };
    writeFileSync(GEO_CACHE_PATH, JSON.stringify(cached));
  } catch { /* ignore */ }

  return anonymous && sessionId ? getAnonymousLocationFile(next, sessionId) : next;
}

function getAnonymousLocationFile(geo: GeoResult, sessionId: string): GeoResult {
  const code = geo.countryCode?.toUpperCase() ?? '';

  try {
    const cached: AnonCache = JSON.parse(readFileSync(ANON_CACHE_PATH, 'utf-8'));
    if (cached.sessionId === sessionId && cached.countryCode === code) {
      return { ...geo, city: cached.city, lat: cached.lat, lon: cached.lon };
    }
  } catch { /* no cache */ }

  const country = (cityCenters as unknown as CityCentersMap)[code];
  const keys = country ? Object.keys(country) : [];

  let anonCity: string | null = null;
  let anonLat: number | null = null;
  let anonLon: number | null = null;

  if (keys.length > 0) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    [anonLat, anonLon] = country[key];
    const displayName = titleCase(key);
    anonCity = geo.countryName ? `${displayName}, ${geo.countryName}` : displayName;
  }

  try {
    writeFileSync(ANON_CACHE_PATH, JSON.stringify({ sessionId, countryCode: code, city: anonCity, lat: anonLat, lon: anonLon }));
  } catch { /* ignore */ }

  return { ...geo, city: anonCity, lat: anonLat, lon: anonLon };
}
