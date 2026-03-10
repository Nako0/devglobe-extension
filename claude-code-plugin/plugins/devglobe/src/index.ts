import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { homedir, tmpdir } from 'os';
import { join, dirname } from 'path';
import { langFromPath } from './lang';
import type { Input, State, GeoResult, AnonCache, Config } from './types';
import cityCenters from './data/city-centers.json';

// ── Constants ──────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://kzcrtlbspkhlnjillhyz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk';
const RATE_LIMIT_MS = 60_000; // 1 minute between heartbeats
const GEO_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const FETCH_TIMEOUT = 10_000; // 10s
const GEO_CACHE_PATH = join(tmpdir(), 'devglobe-geo-cache.json');
const ANON_CACHE_PATH = join(tmpdir(), 'devglobe-anon-location.json');

// ── Main ───────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const raw = readFileSync(0, 'utf-8'); // read stdin
  let input: Input;
  try {
    input = JSON.parse(raw);
  } catch {
    return; // malformed input, skip silently
  }

  const { transcript_path, cwd, hook_event_name } = input;

  // ── API key ────────────────────────────────────────────────────────
  const apiKey = getApiKey();
  if (!apiKey) return; // no key configured, skip silently

  // ── Rate limiting ──────────────────────────────────────────────────
  const statePath = `${transcript_path}.devglobe`;
  const state = readState(statePath);
  const now = Date.now();

  // ── Detect language from hook input ────────────────────────────────
  let language: string | null = null;

  // 1. Direct: PostToolUse gives us the file path in tool_input or tool_response
  if (hook_event_name === 'PostToolUse') {
    const filePath = input.tool_input?.file_path || input.tool_response?.filePath;
    if (filePath) {
      language = langFromPath(filePath);
    }
  }

  // 2. Fallback: reuse last known language from state
  if (!language && state.lastLanguage) {
    language = state.lastLanguage;
  }

  // ── Rate limiting (skip if language just changed or was missing) ───
  const languageChanged = language && language !== state.lastLanguage;
  if (hook_event_name !== 'Stop' && !languageChanged && state.lastHeartbeatAt) {
    if (now - state.lastHeartbeatAt < RATE_LIMIT_MS) return;
  }

  // ── Detect repository (from file's directory first, then cwd) ──────
  let repo: string | null = null;
  const filePath = input.tool_input?.file_path || input.tool_response?.filePath;
  const gitDirs = filePath ? [dirname(filePath), cwd] : [cwd];
  for (const dir of gitDirs) {
    try {
      const url = execSync('git remote get-url origin', {
        cwd: dir,
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
        .toString()
        .trim();
      repo = parseRepoUrl(url);
      if (repo) break;
    } catch {
      // not a git repo or no remote, try next
    }
  }

  // ── Config ──────────────────────────────────────────────────────────
  const config = getConfig();

  // ── Geolocation ────────────────────────────────────────────────────
  let geo = await getGeoLocation();

  // Anonymous mode: replace real location with a random city in the same country
  if (config.anonymousMode !== false && geo) {
    geo = getAnonymousLocation(geo, input.session_id);
  }

  // ── Send heartbeat ─────────────────────────────────────────────────
  const body = JSON.stringify({
    p_key: apiKey,
    ...(language && { p_lang: language }),
    ...(repo && { p_repo: repo }),
    p_share_repo: config.shareRepo === true,
    p_editor: 'claude-code',
    p_anonymous: config.anonymousMode !== false,
    ...(geo?.city && { p_city: geo.city }),
    ...(geo?.lat != null && { p_lat: geo.lat }),
    ...(geo?.lon != null && { p_lng: geo.lon }),
  });

  try {
    await httpPost(`${SUPABASE_URL}/functions/v1/heartbeat`, body, {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    });
  } catch {
    return; // network error, skip silently
  }

  // ── Save state ─────────────────────────────────────────────────────
  writeState(statePath, { lastHeartbeatAt: now, lastLanguage: language });
}

// ── Helpers ────────────────────────────────────────────────────────────

function getApiKey(): string | null {
  // 1. Environment variable
  const envKey = process.env.DEVGLOBE_API_KEY;
  if (envKey?.trim()) return envKey.trim();

  // 2. Config file
  const configPath = join(homedir(), '.devglobe', 'api_key');
  try {
    const key = readFileSync(configPath, 'utf-8').trim();
    if (key) return key;
  } catch {
    // file doesn't exist
  }
  return null;
}

function getConfig(): Config {
  const configPath = join(homedir(), '.devglobe', 'config.json');
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

function readState(path: string): State {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return {};
  }
}

function writeState(path: string, state: State): void {
  try {
    writeFileSync(path, JSON.stringify(state));
  } catch {
    // ignore write errors
  }
}

function parseRepoUrl(url: string): string | null {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/[@/]([^:/]+)[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[2];
  // HTTPS: https://github.com/owner/repo.git
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\.git$/, '').replace(/^\//, '');
    if (parts.includes('/')) return parts;
  } catch {
    // not a valid URL
  }
  return null;
}

async function getGeoLocation(): Promise<GeoResult | null> {
  // Check cache first
  try {
    const cached: GeoResult = JSON.parse(readFileSync(GEO_CACHE_PATH, 'utf-8'));
    if (cached.fetchedAt && Date.now() - cached.fetchedAt < GEO_CACHE_TTL) {
      return cached;
    }
  } catch {
    // no cache or invalid
  }

  // Try primary provider: freeipapi.com
  let geo = await fetchGeo(
    'https://freeipapi.com/api/json',
    (d) => {
      const [lat, lon] = snapToCity(d.cityName, d.countryCode, d.latitude, d.longitude);
      return {
        city: d.cityName && d.countryName ? `${d.cityName}, ${d.countryName}` : null,
        lat,
        lon,
        countryCode: d.countryCode ?? null,
        countryName: d.countryName ?? null,
        fetchedAt: Date.now(),
      };
    },
  );

  // Fallback: ipapi.co
  if (!geo) {
    geo = await fetchGeo(
      'https://ipapi.co/json/',
      (d) => {
        const [lat, lon] = snapToCity(d.city, d.country_code, d.latitude, d.longitude);
        return {
          city: d.city && d.country_name ? `${d.city}, ${d.country_name}` : null,
          lat,
          lon,
          countryCode: d.country_code ?? null,
          countryName: d.country_name ?? null,
          fetchedAt: Date.now(),
        };
      },
    );
  }

  // Cache result
  if (geo) {
    try {
      writeFileSync(GEO_CACHE_PATH, JSON.stringify(geo));
    } catch {
      // ignore
    }
  }

  return geo;
}

/** Capitalizes each word: "sao paulo" → "Sao Paulo", "saint-denis" → "Saint-Denis" */
function titleCase(s: string): string {
  return s.replace(/(?:^|[\s-])\S/g, (c) => c.toUpperCase());
}

/**
 * Returns an anonymized location for the current session.
 * Picks a random city from the 152k+ city-centers database in the same country.
 * Uses a file-based cache so the same random city persists across
 * invocations within the same Claude Code session.
 */
function getAnonymousLocation(geo: GeoResult, sessionId: string): GeoResult {
  const code = geo.countryCode?.toUpperCase() ?? '';

  // Reuse cached anonymous location if same session and same country
  try {
    const cached: AnonCache = JSON.parse(readFileSync(ANON_CACHE_PATH, 'utf-8'));
    if (cached.sessionId === sessionId && cached.countryCode === code) {
      return { ...geo, city: cached.city, lat: cached.lat, lon: cached.lon };
    }
  } catch {
    // no cache or invalid
  }

  const country = (cityCenters as unknown as Record<string, Record<string, [number, number]>>)[code];
  const keys = country ? Object.keys(country) : [];
  let anonCity: string | null;
  let anonLat: number | null;
  let anonLon: number | null;

  if (keys.length > 0) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    [anonLat, anonLon] = country[key];
    const displayName = titleCase(key);
    anonCity = geo.countryName ? `${displayName}, ${geo.countryName}` : displayName;
  } else {
    // Fallback: random offset ±1-2° (still in the same rough area)
    const offset = () => (Math.random() - 0.5) * 4;
    anonLat = geo.lat != null ? Math.round((geo.lat + offset()) * 10) / 10 : null;
    anonLon = geo.lon != null ? Math.round((geo.lon + offset()) * 10) / 10 : null;
    anonCity = geo.countryName ?? null;
  }

  // Persist for this session
  try {
    const cache: AnonCache = { sessionId, countryCode: code, city: anonCity, lat: anonLat, lon: anonLon };
    writeFileSync(ANON_CACHE_PATH, JSON.stringify(cache));
  } catch {
    // ignore
  }

  return { ...geo, city: anonCity, lat: anonLat, lon: anonLon };
}

function roundCoord(v: unknown): number | null {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  return Math.round(v * 10) / 10; // ~11km precision — used only as fallback
}

function normalizeCity(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Snaps coordinates to canonical city center from GeoNames (152k+ cities). */
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
  return [roundCoord(lat + dLat) ?? lat, roundCoord(lon + dLon) ?? lon];
}

async function fetchGeo(
  url: string,
  parse: (data: any) => GeoResult,
): Promise<GeoResult | null> {
  try {
    const raw = await httpGet(url);
    const data = JSON.parse(raw);
    const result = parse(data);
    if (result.lat == null || result.lon == null) return null;
    return result;
  } catch {
    return null;
  }
}

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? httpsRequest : httpRequest;
    const req = mod(url, { method: 'GET', timeout: FETCH_TIMEOUT }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(Buffer.concat(chunks).toString());
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

function httpPost(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? httpsRequest : httpRequest;
    const req = mod(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body).toString() },
        timeout: FETCH_TIMEOUT,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(Buffer.concat(chunks).toString());
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(body);
    req.end();
  });
}

// ── Run ────────────────────────────────────────────────────────────────
main().catch(() => process.exit(0));
