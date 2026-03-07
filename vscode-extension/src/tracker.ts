import * as vscode from 'vscode';
import { sendHeartbeat, NetworkError, ApiError } from './heartbeat';
import { HEARTBEAT_INTERVAL, ACTIVITY_TIMEOUT, OFFLINE_THRESHOLD } from './constants';
import { log } from './logger';

export interface TrackerState {
    connected: boolean;
    tracking: boolean;
    codingTime: string;
    language: string | null;
    shareRepo: boolean;
    statusMessage: string;
    offline: boolean;
}

export const DEFAULT_STATE: TrackerState = {
    connected: false,
    tracking: false,
    codingTime: '0m',
    language: null,
    shareRepo: false,
    statusMessage: '',
    offline: false,
};

// ---------------------------------------------------------------------------
// Tracker class
// ---------------------------------------------------------------------------

/**
 * Manages the heartbeat loop, status bar, and offline detection.
 *
 * The owner (extension.ts) provides a callback that is called whenever the
 * state changes, so the sidebar can be updated.
 */
export class Tracker implements vscode.Disposable {
    private state: TrackerState;
    private heartbeatTimer: ReturnType<typeof setInterval> | null;
    private statusBarItem: vscode.StatusBarItem | null;
    private lastActivity: number;
    private consecutiveNetErrors: number;
    private currentApiKey: string | null;
    private ticking: boolean;
    private last5xxWarning: number;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly onStateChange: (state: TrackerState) => void,
    ) {
        this.state = { ...DEFAULT_STATE };
        this.heartbeatTimer = null;
        this.statusBarItem = null;
        this.lastActivity = 0;
        this.consecutiveNetErrors = 0;
        this.currentApiKey = null;
        this.ticking = false;
        this.last5xxWarning = 0;

        // Ensure cleanup when the extension is deactivated
        context.subscriptions.push(this);
    }

    // -------------------------------------------------------------------------
    // Disposable
    // -------------------------------------------------------------------------

    dispose(): void {
        this.clearTimer();
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /** Returns a snapshot of the current state. */
    getState(): TrackerState {
        return { ...this.state };
    }

    /** Call this on every text-document change to keep the activity timer alive. */
    recordActivity(): void {
        this.lastActivity = Date.now();
    }

    /**
     * Restore a connected-but-paused state on activation (key exists, trackingEnabled=false).
     * Shows the dashboard without starting the heartbeat loop.
     */
    restoreConnected(apiKey: string, config: vscode.WorkspaceConfiguration): void {
        this.currentApiKey = apiKey;
        this.state.connected = true;
        this.state.tracking = false;
        this.state.shareRepo = config.get('shareRepo', false);
        this.state.statusMessage = config.get('statusMessage', '');
    }

    /** Update a boolean preference in the live state (e.g. shareRepo). */
    updatePreference(key: keyof TrackerState, value: boolean): void {
        (this.state as unknown as Record<string, unknown>)[key] = value;
        this.pushState();
    }

    /** Update the status message in the live state. */
    setStatusMessage(message: string): void {
        this.state.statusMessage = message;
        this.pushState();
    }

    /** Start (or restart) the heartbeat loop with the given API key. */
    start(apiKey: string): void {
        this.clearTimer();
        this.currentApiKey = apiKey;
        this.ensureStatusBar();

        const config = vscode.workspace.getConfiguration('devglobe');
        this.setStatusBarText('$(clock) 0m');
        this.statusBarItem?.show();
        this.consecutiveNetErrors = 0;

        this.state = {
            ...this.state,
            connected: true,
            tracking: true,
            offline: false,
            shareRepo: config.get('shareRepo', false),
            statusMessage: config.get('statusMessage', ''),
        };
        this.pushState();
        this.lastActivity = Date.now();

        // Heartbeat loop: fires every 30 s, skipped if user is idle
        this.heartbeatTimer = setInterval(() => {
            if (Date.now() - this.lastActivity > ACTIVITY_TIMEOUT) return;
            this.tick(apiKey);
        }, HEARTBEAT_INTERVAL);

        // Fire once immediately so the sidebar shows data right away
        this.tick(apiKey);
    }

    /**
     * Pause the heartbeat loop while keeping the "connected" state.
     * Used by the "Stop Tracking" button.
     */
    pause(): void {
        this.clearTimer();
        this.state.tracking = false;
        this.pushState();
    }

    /**
     * Fully disconnect: pause + clear API key + mark as not connected.
     */
    stop(): void {
        this.pause();
        this.currentApiKey = null;
        this.state.connected = false;
        this.pushState();
    }

    /**
     * Reset to the initial state.
     * Used by the "Disconnect" action.
     */
    reset(): void {
        this.stop();
        this.state = { ...DEFAULT_STATE };
        this.pushState();
    }

    /**
     * Called when the webview detects that the browser came back online
     * (window 'online' event). Sends a heartbeat immediately if appropriate.
     */
    handleNetworkRestored(): void {
        if (!this.state.offline || !this.state.tracking) return;
        this.consecutiveNetErrors = 0;
        this.state.offline = false;
        log.info('Network restored — tracking resumed');
        this.pushState();
        vscode.window.showInformationMessage('DevGlobe: Network restored — tracking resumed');
        if (this.currentApiKey && Date.now() - this.lastActivity <= ACTIVITY_TIMEOUT) {
            this.tick(this.currentApiKey);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private async tick(apiKey: string): Promise<void> {
        // Prevent overlapping ticks (async heartbeat may outlast the 30s interval)
        if (this.ticking) return;
        this.ticking = true;

        try {
            const result = await sendHeartbeat(apiKey);

            this.consecutiveNetErrors = 0;
            if (this.state.offline) {
                this.state.offline = false;
                log.info('Network restored — tracking resumed');
                vscode.window.showInformationMessage('DevGlobe: Network restored — tracking resumed');
            }

            this.state.codingTime = formatTime(result.todaySeconds);
            this.state.language   = result.language;
            this.updateStatusBar(result.todaySeconds);
            this.pushState();
        } catch (e) {
            if (e instanceof NetworkError) {
                this.consecutiveNetErrors++;
                log.warn(`Network error #${this.consecutiveNetErrors}:`, (e as Error).message);
                if (this.consecutiveNetErrors >= OFFLINE_THRESHOLD && !this.state.offline) {
                    this.state.offline = true;
                    this.pushState();
                    vscode.window.showWarningMessage('DevGlobe: No network — tracking paused');
                }
            } else if (e instanceof ApiError) {
                log.error(`Heartbeat API error (${e.status}):`, e.message);
                // Throttle 5xx warnings: at most once per 2 minutes
                if (e.status >= 500 && Date.now() - this.last5xxWarning > 120_000) {
                    this.last5xxWarning = Date.now();
                    vscode.window.showWarningMessage('DevGlobe: Server error — will retry');
                }
            } else {
                log.error('Heartbeat failed:', (e as Error).message);
            }
        } finally {
            this.ticking = false;
        }
    }

    private ensureStatusBar(): void {
        if (this.statusBarItem) return;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.tooltip = 'DevGlobe: Coding time today';
        this.context.subscriptions.push(this.statusBarItem);
    }

    private setStatusBarText(text: string): void {
        if (this.statusBarItem) this.statusBarItem.text = text;
    }

    private updateStatusBar(todaySeconds: number): void {
        if (!this.statusBarItem) return;
        const label = formatTime(todaySeconds);
        this.statusBarItem.text    = `$(clock) ${label}`;
        this.statusBarItem.tooltip = `DevGlobe: ${label} coded today`;
        this.statusBarItem.show();
    }

    /** Clear the heartbeat interval without touching state or pushing to sidebar. */
    private clearTimer(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        this.statusBarItem?.hide();
    }

    private pushState(): void {
        this.onStateChange({ ...this.state });
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function formatTime(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
