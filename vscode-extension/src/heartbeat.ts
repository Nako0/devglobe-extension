import * as vscode from 'vscode';
import { SUPABASE_URL, SUPABASE_ANON_KEY, FETCH_TIMEOUT_MS } from './constants';
import { fetchGeolocation } from './geo';
import { getActiveLanguage } from './language';
import { detectRepo, getCommitStats } from './git';
import { log } from './logger';

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

/** Commit stats waiting to be flushed with the next successful heartbeat. */
let pendingCommitStats: { insertions: number; deletions: number } | null = null;

/**
 * Sends a heartbeat to the DevGlobe backend.
 *
 * - Throws `NetworkError` if the request could not be made (offline).
 * - Throws `ApiError` if the server returns a non-2xx response.
 * - Returns coding-time and active language on success.
 */
export async function sendHeartbeat(apiKey: string): Promise<{ todaySeconds: number; language: string | null }> {
    const [geo, activeLang, repo, commitStats] = await Promise.all([
        fetchGeolocation(),
        Promise.resolve(getActiveLanguage()),
        detectRepo(),
        getCommitStats(),
    ]);

    const config = vscode.workspace.getConfiguration('devglobe');

    const body: Record<string, unknown> = {
        p_key: apiKey,
    };

    if (geo) {
        if (geo.city)    body.p_city = geo.city;
        if (geo.lat != null) body.p_lat = geo.lat;
        if (geo.lon != null) body.p_lng = geo.lon;
    }

    if (activeLang) body.p_lang = activeLang;
    body.p_editor = 'vscode';

    if (repo) {
        body.p_repo = repo;
        body.p_share_repo = config.get('shareRepo', false);
    }

    // Accumulate commit stats; flush them once per new commit.
    if (commitStats) pendingCommitStats = commitStats;
    if (pendingCommitStats && repo) {
        body.p_insertions = pendingCommitStats.insertions;
        body.p_deletions  = pendingCommitStats.deletions;
    }

    // Log without the API key for security
    const { p_key: _omit, ...logBody } = body;
    log.debug('Sending heartbeat:', JSON.stringify(logBody, null, 2));

    let res: Response;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        res = await fetch(`${SUPABASE_URL}/functions/v1/heartbeat`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timer);
    } catch (e) {
        throw new NetworkError((e as Error).message);
    }

    if (!res.ok) {
        const text = await res.text();
        throw new ApiError(res.status, text);
    }

    // Clear pending commit stats after a confirmed successful send
    if (pendingCommitStats && repo) pendingCommitStats = null;

    const data = await res.json() as { today_seconds?: number };
    return { todaySeconds: data.today_seconds ?? 0, language: activeLang };
}

/**
 * Calls the update_status_message RPC.
 * Returns true on success, false otherwise.
 */
export async function updateStatusMessage(apiKey: string, message: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_status_message`, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ p_key: apiKey, p_message: message }),
            signal: controller.signal,
        });
        clearTimeout(timer);
        return res.ok;
    } catch {
        return false;
    }
}
