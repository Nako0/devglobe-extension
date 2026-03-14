import * as vscode from 'vscode';
import { SUPABASE_URL, SUPABASE_ANON_KEY, FETCH_TIMEOUT_MS } from './constants';
import { fetchGeolocation } from './geo';
import { getActiveLanguage } from './language';
import { detectRepo } from './git';
import { log } from './logger';

/** Minimum time between heartbeat requests (prevents runaway loops). */
const MIN_HEARTBEAT_GAP = 10_000; // 10 seconds
let lastHeartbeatSent = 0;

/** Maximum payload size in bytes (prevents oversized requests). */
const MAX_PAYLOAD_BYTES = 2048;

/** Minimum time between status update requests. */
const MIN_STATUS_GAP = 5_000; // 5 seconds
let lastStatusSent = 0;

/** Maps `vscode.env.appName` to a short editor ID sent in heartbeats. */
function detectEditor(): string {
    const name = vscode.env.appName.toLowerCase();
    if (name.includes('cursor'))       return 'cursor';
    if (name.includes('windsurf'))     return 'windsurf';
    if (name.includes('vscodium'))     return 'vscodium';
    if (name.includes('positron'))     return 'positron';
    if (name.includes('void'))         return 'void';
    if (name.includes('antigravity'))  return 'antigravity';
    return 'vscode';
}

/**
 * Thrown when the fetch itself fails (no internet, DNS failure, timeout…).
 * Distinct from API errors so callers can handle offline detection separately.
 */
export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

/**
 * Thrown when the server returns a non-2xx response.
 * Carries the HTTP status and response body for diagnostics.
 */
export class ApiError extends Error {
    constructor(public readonly status: number, body: string) {
        super(`HTTP ${status}: ${body}`);
        this.name = 'ApiError';
    }
}

const HEADERS = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
};

/**
 * Sends a heartbeat to the DevGlobe backend.
 *
 * - Throws `NetworkError` if the request could not be made (offline).
 * - Throws `ApiError` if the server returns a non-2xx response.
 * - Returns coding-time and active language on success.
 */
export async function sendHeartbeat(apiKey: string): Promise<{ todaySeconds: number; language: string | null }> {
    const now = Date.now();
    if (now - lastHeartbeatSent < MIN_HEARTBEAT_GAP) {
        log.debug('Heartbeat throttled (too soon since last send)');
        return { todaySeconds: 0, language: null };
    }

    const config = vscode.workspace.getConfiguration('devglobe');
    const anonymous = config.get<boolean>('anonymousMode', false);

    const [geo, activeLang, repo] = await Promise.all([
        fetchGeolocation(anonymous),
        Promise.resolve(getActiveLanguage()),
        detectRepo(),
    ]);

    const body: Record<string, unknown> = {
        p_key: apiKey,
    };

    if (geo) {
        if (geo.city)    body.p_city = geo.city;
        if (geo.lat != null) body.p_lat = geo.lat;
        if (geo.lon != null) body.p_lng = geo.lon;
    }

    if (activeLang) body.p_lang = activeLang;
    body.p_editor = detectEditor();
    body.p_anonymous = anonymous;

    body.p_share_repo = config.get('shareRepo', false);
    if (repo && body.p_share_repo) {
        body.p_repo = repo;
    }

    // Guard against oversized payloads
    const payload = JSON.stringify(body);
    if (Buffer.byteLength(payload, 'utf8') > MAX_PAYLOAD_BYTES) {
        log.warn('Heartbeat payload exceeds size limit, truncating repo');
        if (body.p_repo) {
            body.p_repo = String(body.p_repo).slice(0, 100);
        }
    }

    // Log without the API key for security
    const { p_key: _omit, ...logBody } = body;
    log.debug('Sending heartbeat:', JSON.stringify(logBody, null, 2));

    let res: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/heartbeat`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } catch (e) {
        throw new NetworkError((e as Error).message);
    } finally {
        clearTimeout(timer);
    }

    if (!res.ok) {
        const text = await res.text();
        throw new ApiError(res.status, text);
    }

    lastHeartbeatSent = Date.now();

    const data = await res.json() as { today_seconds?: number };
    return { todaySeconds: data.today_seconds ?? 0, language: activeLang };
}

/**
 * Calls the update_status_message RPC.
 * Returns true on success, false otherwise.
 */
export async function updateStatusMessage(apiKey: string, message: string): Promise<boolean> {
    if (Date.now() - lastStatusSent < MIN_STATUS_GAP) {
        log.debug('Status update throttled');
        return false;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_status_message`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ p_key: apiKey, p_message: message }),
            signal: controller.signal,
        });
        if (res.ok) {
            lastStatusSent = Date.now();
        }
        return res.ok;
    } catch {
        return false;
    } finally {
        clearTimeout(timer);
    }
}
