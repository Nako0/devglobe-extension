import { SUPABASE_URL, SUPABASE_ANON_KEY, FETCH_TIMEOUT_MS } from './constants.js';
import { fetchGeolocation } from './geo.js';
import { detectRepo } from './git.js';
import { langFromPath } from './language.js';
import type { GeoResult } from './types.js';

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

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

export type HeartbeatParams = {
  apiKey: string;
  editor: string;
  anonymous: boolean;
  shareRepo: boolean;
  filePath?: string;
  cwd?: string;
  language?: string | null;
  geo?: GeoResult | null;
};

export async function sendHeartbeat(params: HeartbeatParams): Promise<{ todaySeconds: number; language: string | null }> {
  const { apiKey, editor, anonymous, shareRepo, filePath, cwd, language: explicitLang } = params;

  const lang = explicitLang ?? (filePath ? langFromPath(filePath) : null);

  const [geo, repo] = await Promise.all([
    params.geo !== undefined ? Promise.resolve(params.geo) : fetchGeolocation(anonymous),
    cwd ? detectRepo(cwd) : Promise.resolve(null),
  ]);

  const body: Record<string, unknown> = { p_key: apiKey };

  if (geo) {
    if (geo.city) body.p_city = geo.city;
    if (geo.lat != null) body.p_lat = geo.lat;
    if (geo.lon != null) body.p_lng = geo.lon;
  }

  if (lang) body.p_lang = lang;
  body.p_editor = editor;
  body.p_anonymous = anonymous;
  body.p_share_repo = shareRepo;

  if (repo && shareRepo) body.p_repo = repo;

  let res: Response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/heartbeat`, {
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

  const data = await res.json() as { today_seconds?: number };
  return { todaySeconds: data.today_seconds ?? 0, language: lang };
}

export async function updateStatusMessage(apiKey: string, message: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_status_message`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ p_key: apiKey, p_message: message }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
