import { GEO_CACHE_TTL, GEO_TIMEOUT_MS } from './constants';
import { log } from './logger';
import cityCenters from './data/city-centers.json';

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

/** Rounds to 1 decimal (~11 km precision) — used only as fallback. */
function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

/**
 * Normalizes a city name for lookup: lowercase, no diacritics.
 */
function normalizeCity(name: string): string {
    return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Snaps coordinates to the canonical city center from GeoNames (152k+ cities).
 * If the city is not found, falls back to rounding coordinates to ~11 km.
 */
function snapToCity(
    cityName: string | null | undefined,
    countryCode: string | null | undefined,
    lat: number,
    lon: number,
): [number, number] {
    if (cityName && countryCode) {
        const country = (cityCenters as unknown as Record<string, Record<string, [number, number]>>)[countryCode.toUpperCase()];
        if (country) {
            const center = country[normalizeCity(cityName)];
            if (center) return center;
        }
    }
    // Fallback: random point within a 20km radius circle
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.sqrt(Math.random()) * 0.18; // 20km ≈ 0.18°
    const dLat = r * Math.cos(angle);
    const dLon = r * Math.sin(angle) / Math.cos(lat * Math.PI / 180);
    return [round1(lat + dLat), round1(lon + dLon)];
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
    return {
        city,
        lat: snappedLat,
        lon: snappedLon,
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

    const [snappedLat, snappedLon] = snapToCity(data.city, data.country_code, lat, lon);
    return {
        city,
        lat: snappedLat,
        lon: snappedLon,
        countryCode: data.country_code ?? null,
        countryName: data.country_name ?? null,
    };
}

/** Capitalizes each word: "sao paulo" → "Sao Paulo", "saint-denis" → "Saint-Denis" */
function titleCase(s: string): string {
    return s.replace(/(?:^|[\s-])\S/g, (c) => c.toUpperCase());
}

/**
 * Returns an anonymized location for the current session.
 * Picks a random city from the 152k+ city-centers database in the same country.
 * The random city is picked once and reused until `resetAnonymousLocation()` is called.
 */
function getAnonymousLocation(geo: GeoResult): GeoResult {
    // Reuse cached anonymous location if same country
    if (cachedAnonymous && cachedAnonymous.countryCode === geo.countryCode) {
        return cachedAnonymous;
    }

    const code = geo.countryCode?.toUpperCase() ?? '';
    const country = (cityCenters as unknown as Record<string, Record<string, [number, number]>>)[code];
    const keys = country ? Object.keys(country) : [];

    if (keys.length > 0) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        const [lat, lon] = country[key];
        const displayName = titleCase(key);
        cachedAnonymous = {
            city: geo.countryName ? `${displayName}, ${geo.countryName}` : displayName,
            lat,
            lon,
            countryCode: geo.countryCode,
            countryName: geo.countryName,
        };
    } else {
        cachedAnonymous = {
            city: null,
            lat: null,
            lon: null,
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
 * - Coordinates are snapped to city centers (152k+ cities) for privacy
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
