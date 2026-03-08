/** Context received via stdin from Claude Code hooks. */
export type Input = {
  session_id: string;
  transcript_path: string;
  cwd: string;
  hook_event_name: 'PostToolUse' | 'UserPromptSubmit' | 'Stop';
  // PostToolUse fields
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    command?: string;
    [key: string]: unknown;
  };
  tool_response?: {
    filePath?: string;
    [key: string]: unknown;
  };
};

/** Persisted state for rate-limiting heartbeats. */
export type State = {
  lastHeartbeatAt?: number;
  lastLanguage?: string | null;
};

/** Geolocation result. */
export type GeoResult = {
  city: string | null;
  lat: number | null;
  lon: number | null;
  fetchedAt: number;
};

/** User config stored in ~/.devglobe/config.json */
export type Config = {
  shareRepo?: boolean;
};
