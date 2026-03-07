import { GEO_CACHE_TTL, GEO_TIMEOUT_MS } from './constants';
import { log } from './logger';

interface GeoResult {
    city: string | null;
    lat: number | null;
    lon: number | null;
}

let cached: GeoResult | null = null;
let lastFetch = 0;

/** Rounds to 1 decimal (~11 km precision) to protect privacy. */
function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

/** Returns true if lat/lon are within valid WGS-84 bounds. */
function validCoords(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/** Fetches with a timeout and returns the parsed JSON, or null on failure. */
async function fetchJson(url: string): Promise<unknown | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        clearTimeout(timer);
        return null;
    }
}

/**
 * Provider 1: freeipapi.com
 */
async function fromFreeIpApi(): Promise<GeoResult | null> {
    const data = await fetchJson('https://freeipapi.com/api/json') as {
        cityName?: string; countryName?: string;
        latitude?: unknown; longitude?: unknown;
    } | null;
    if (!data) return null;

    const lat = typeof data.latitude === 'number' ? data.latitude : null;
    const lon = typeof data.longitude === 'number' ? data.longitude : null;
    if (lat == null || lon == null || !validCoords(lat, lon)) return null;

    const city = data.cityName && data.countryName
        ? `${data.cityName}, ${data.countryName}`
        : (data.cityName ?? data.countryName ?? null);

    return { city, lat: round1(lat), lon: round1(lon) };
}

/**
 * Provider 2 (fallback): ipapi.co
 */
async function fromIpApiCo(): Promise<GeoResult | null> {
    const data = await fetchJson('https://ipapi.co/json/') as {
        city?: string; country_name?: string;
        latitude?: unknown; longitude?: unknown;
    } | null;
    if (!data) return null;

    const lat = typeof data.latitude === 'number' ? data.latitude : null;
    const lon = typeof data.longitude === 'number' ? data.longitude : null;
    if (lat == null || lon == null || !validCoords(lat, lon)) return null;

    const city = data.city && data.country_name
        ? `${data.city}, ${data.country_name}`
        : (data.city ?? data.country_name ?? null);

    return { city, lat: round1(lat), lon: round1(lon) };
}

/**
 * Returns the developer's approximate location.
 *
 * - Tries freeipapi.com first, falls back to ipapi.co
 * - Results are cached for one hour
 * - Coordinates are rounded to ~11 km precision for privacy
 * - Returns stale cache if both providers fail
 */
export async function fetchGeolocation(): Promise<GeoResult | null> {
    if (cached && Date.now() - lastFetch < GEO_CACHE_TTL) {
        return cached;
    }

    try {
        const next = await fromFreeIpApi() ?? await fromIpApiCo();
        if (!next) {
            log.warn('Geolocation: both providers failed');
            return cached;
        }

        if (cached && cached.city !== next.city && next.city) {
            log.info(`City changed: ${cached.city} → ${next.city}`);
        }

        cached = next;
        lastFetch = Date.now();
        return cached;
    } catch (e) {
        log.warn('Geolocation failed:', (e as Error).message);
        return cached;
    }
}
