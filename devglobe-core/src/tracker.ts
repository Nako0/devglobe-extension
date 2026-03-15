import {
  sendHeartbeat,
  updateStatusMessage,
  NetworkError,
  ApiError,
} from "./heartbeat.js";
import { resetAnonymousLocation } from "./geo.js";
import {
  HEARTBEAT_INTERVAL,
  ACTIVITY_TIMEOUT,
  OFFLINE_THRESHOLD,
} from "./constants.js";
import type { TrackerState, CoreEvent } from "./types.js";

function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const DEFAULT_STATE: TrackerState = {
  connected: false,
  tracking: false,
  coding_time: "0m",
  language: null,
  share_repo: false,
  anonymous_mode: false,
  status_message: "",
  offline: false,
};

export class Tracker {
  private state: TrackerState;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivity = 0;
  private consecutiveNetErrors = 0;
  private currentApiKey: string | null = null;
  private editor = "unknown";
  private ticking = false;
  private last5xxWarning = 0;
  private lastCwd: string | null = null;
  private lastFilePath: string | null = null;
  private lastLanguage: string | null = null;

  constructor(private readonly emit: (event: CoreEvent) => void) {
    this.state = { ...DEFAULT_STATE };
  }

  getState(): TrackerState {
    return { ...this.state };
  }

  init(
    apiKey: string,
    editor: string,
    shareRepo?: boolean,
    anonymousMode?: boolean,
    statusMessage?: string,
  ): void {
    this.currentApiKey = apiKey;
    this.editor = editor;
    this.state.connected = true;
    this.state.share_repo = shareRepo ?? false;
    this.state.anonymous_mode = anonymousMode ?? false;
    this.state.status_message = statusMessage ?? "";
    this.pushState();
  }

  recordActivity(filePath: string, cwd: string, language?: string): void {
    this.lastActivity = Date.now();
    this.lastFilePath = filePath;
    this.lastCwd = cwd;
    if (language) this.lastLanguage = language;
  }

  setConfig(shareRepo?: boolean, anonymousMode?: boolean): void {
    if (shareRepo !== undefined) this.state.share_repo = shareRepo;
    if (
      anonymousMode !== undefined &&
      anonymousMode !== this.state.anonymous_mode
    ) {
      this.state.anonymous_mode = anonymousMode;
      resetAnonymousLocation();
    }
    this.pushState();
  }

  async setStatus(message: string): Promise<void> {
    if (!this.currentApiKey) return;
    const ok = await updateStatusMessage(this.currentApiKey, message);
    if (ok) {
      this.state.status_message = message;
      this.pushState();
      this.emit({ event: "status_ok", data: { message } });
    } else {
      this.emit({
        event: "status_error",
        data: { message: "Failed to update status" },
      });
    }
  }

  start(): void {
    if (!this.currentApiKey) return;
    this.clearTimer();
    resetAnonymousLocation();
    this.consecutiveNetErrors = 0;
    this.state.connected = true;
    this.state.tracking = true;
    this.state.offline = false;
    this.pushState();
    this.lastActivity = Date.now();

    const apiKey = this.currentApiKey;
    this.heartbeatTimer = setInterval(() => {
      if (Date.now() - this.lastActivity > ACTIVITY_TIMEOUT) return;
      this.tick(apiKey);
    }, HEARTBEAT_INTERVAL);

    this.tick(apiKey);
  }

  pause(): void {
    this.clearTimer();
    this.state.tracking = false;
    this.pushState();
  }

  resume(): void {
    if (this.currentApiKey) this.start();
  }

  shutdown(): void {
    this.clearTimer();
    this.state = { ...DEFAULT_STATE };
  }

  private async tick(apiKey: string): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;

    try {
      const result = await sendHeartbeat({
        apiKey,
        editor: this.editor,
        anonymous: this.state.anonymous_mode,
        shareRepo: this.state.share_repo,
        filePath: this.lastFilePath ?? undefined,
        cwd: this.lastCwd ?? undefined,
        language: this.lastLanguage,
      });

      this.consecutiveNetErrors = 0;
      if (this.state.offline) {
        this.state.offline = false;
        this.emit({ event: "online", data: { message: "Network restored" } });
      }

      this.state.coding_time = formatTime(result.todaySeconds);
      this.state.language = result.language;
      this.pushState();
      this.emit({
        event: "heartbeat_ok",
        data: { today_seconds: result.todaySeconds, language: result.language },
      });
    } catch (e) {
      if (e instanceof NetworkError) {
        this.consecutiveNetErrors++;
        if (
          this.consecutiveNetErrors >= OFFLINE_THRESHOLD &&
          !this.state.offline
        ) {
          this.state.offline = true;
          this.pushState();
          this.emit({
            event: "offline",
            data: { message: "No network — tracking paused" },
          });
        }
      } else if (e instanceof ApiError && e.status >= 500) {
        if (Date.now() - this.last5xxWarning > 120_000) {
          this.last5xxWarning = Date.now();
        }
      }
    } finally {
      this.ticking = false;
    }
  }

  private clearTimer(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private pushState(): void {
    this.emit({ event: "state", data: { ...this.state } });
  }
}
