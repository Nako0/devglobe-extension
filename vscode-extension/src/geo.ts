import { GEO_CACHE_TTL, GEO_TIMEOUT_MS } from './constants';
import { log } from './logger';
import anonymousCities from './data/anonymous-cities.json';

interface GeoResult {
    city: string | null;
    lat: number | null;
    lon: number | null;
    countryCode: string | null;
    countryName: string | null;
}

let cached: GeoResult | null = null;
let cachedAnonymous: GeoResult | null = null;
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

    return {
        city,
        lat: round1(lat),
        lon: round1(lon),
        countryCode: data.countryCode ?? null,
        countryName: data.countryName ?? null,
    };
}

/**
 * Provider 2 (fallback): ipapi.co
 */
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

    return {
        city,
        lat: round1(lat),
        lon: round1(lon),
        countryCode: data.country_code ?? null,
        countryName: data.country_name ?? null,
    };
}

/**
 * Returns an anonymized location for the current session.
 * The random city is picked once and reused until `resetAnonymousLocation()` is called.
 */
function getAnonymousLocation(geo: GeoResult): GeoResult {
    // Reuse cached anonymous location if same country
    if (cachedAnonymous && cachedAnonymous.countryCode === geo.countryCode) {
        return cachedAnonymous;
    }

    const code = geo.countryCode?.toUpperCase() ?? '';
    const cities = (anonymousCities as Record<string, (number | string)[][]>)[code];

    if (cities && cities.length > 0) {
        const pick = cities[Math.floor(Math.random() * cities.length)];
        const cityName = pick[2] as string;
        cachedAnonymous = {
            city: geo.countryName ? `${cityName}, ${geo.countryName}` : cityName,
            lat: pick[0] as number,
            lon: pick[1] as number,
            countryCode: geo.countryCode,
            countryName: geo.countryName,
        };
    } else {
        // Fallback: random offset ±1-2° (still in the same rough area)
        const offset = () => (Math.random() - 0.5) * 4;
        cachedAnonymous = {
            city: geo.countryName ?? null,
            lat: geo.lat != null ? round1(geo.lat + offset()) : null,
            lon: geo.lon != null ? round1(geo.lon + offset()) : null,
            countryCode: geo.countryCode,
            countryName: geo.countryName,
        };
    }

    return cachedAnonymous;
}

/**
 * Clears the cached anonymous location so the next heartbeat picks a new random city.
 * Call this when a new tracking session starts.
 */
export function resetAnonymousLocation(): void {
    cachedAnonymous = null;
}

/**
 * Returns the developer's approximate location.
 *
 * - Tries freeipapi.com first, falls back to ipapi.co
 * - Results are cached for one hour
 * - Coordinates are rounded to ~11 km precision for privacy
 * - When `anonymous` is true, returns a random city in the same country
 * - Returns stale cache if both providers fail
 */
export async function fetchGeolocation(anonymous = false): Promise<GeoResult | null> {
    if (cached && Date.now() - lastFetch < GEO_CACHE_TTL) {
        return anonymous ? getAnonymousLocation(cached) : cached;
    }

    try {
        const next = await fromFreeIpApi() ?? await fromIpApiCo();
        if (!next) {
            log.warn('Geolocation: both providers failed');
            return cached ? (anonymous ? getAnonymousLocation(cached) : cached) : null;
        }

        if (cached && cached.city !== next.city && next.city) {
            log.info(`City changed: ${cached.city} → ${next.city}`);
        }

        cached = next;
        lastFetch = Date.now();
        return anonymous ? getAnonymousLocation(cached) : cached;
    } catch (e) {
        log.warn('Geolocation failed:', (e as Error).message);
        return cached ? (anonymous ? getAnonymousLocation(cached) : cached) : null;
    }
}
