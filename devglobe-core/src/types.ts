// ── Client → Core messages ─────────────────────────────────────────────

export type InitParams = {
  api_key: string;
  editor: string;
  share_repo?: boolean;
  anonymous_mode?: boolean;
  status_message?: string;
};

export type ActivityParams = {
  file_path: string;
  cwd: string;
  language?: string;
};

export type SetConfigParams = {
  share_repo?: boolean;
  anonymous_mode?: boolean;
};

export type SetStatusParams = {
  message: string;
};

export type ClientMessage =
  | { method: 'init'; params: InitParams }
  | { method: 'activity'; params: ActivityParams }
  | { method: 'set_config'; params: SetConfigParams }
  | { method: 'set_status'; params: SetStatusParams }
  | { method: 'pause' }
  | { method: 'resume' }
  | { method: 'shutdown' };

// ── Core → Client events ──────────────────────────────────────────────

export type StateEvent = {
  event: 'state';
  data: TrackerState;
};

export type HeartbeatOkEvent = {
  event: 'heartbeat_ok';
  data: { today_seconds: number; language: string | null };
};

export type OfflineEvent = {
  event: 'offline';
  data: { message: string };
};

export type OnlineEvent = {
  event: 'online';
  data: { message: string };
};

export type StatusOkEvent = {
  event: 'status_ok';
  data: { message: string };
};

export type StatusErrorEvent = {
  event: 'status_error';
  data: { message: string };
};

export type CoreEvent =
  | StateEvent
  | HeartbeatOkEvent
  | OfflineEvent
  | OnlineEvent
  | StatusOkEvent
  | StatusErrorEvent;

// ── Shared state ──────────────────────────────────────────────────────

export type TrackerState = {
  connected: boolean;
  tracking: boolean;
  coding_time: string;
  language: string | null;
  share_repo: boolean;
  anonymous_mode: boolean;
  status_message: string;
  offline: boolean;
};

// ── Geolocation ───────────────────────────────────────────────────────

export type GeoResult = {
  city: string | null;
  lat: number | null;
  lon: number | null;
  countryCode: string | null;
  countryName: string | null;
};

export type GeoResultWithTimestamp = GeoResult & {
  fetchedAt: number;
};

// ── One-shot mode (Claude Code) ───────────────────────────────────────

export type OneshotParams = {
  file_path?: string;
  cwd: string;
  editor: string;
  language?: string;
  session_id?: string;
  force?: boolean;
};

export type OneshotState = {
  lastHeartbeatAt?: number;
  lastLanguage?: string | null;
  lastRepo?: string | null;
};

export type AnonCache = {
  sessionId: string;
  countryCode: string;
  city: string | null;
  lat: number | null;
  lon: number | null;
};

export type Config = {
  shareRepo?: boolean;
  anonymousMode?: boolean;
};
