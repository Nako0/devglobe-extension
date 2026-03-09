import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { TrackerState } from './tracker';

type MessageHandler = (msg: Record<string, unknown>) => void;
type StateGetter = () => TrackerState;

/**
 * Provides the DevGlobe sidebar webview.
 *
 * The extension registers this provider once, then communicates with it via:
 * - `updateState(state)` — push new state (sidebar re-renders immediately)
 * - `sendToast(message)` — show a transient in-sidebar toast
 *
 * The sidebar sends messages back via `vscode.postMessage()`.
 * Register a handler with `setMessageHandler()`.
 */
export class DevGlobeSidebarProvider implements vscode.WebviewViewProvider {
    static readonly viewType = 'devglobe.sidebarView';

    private view: vscode.WebviewView | null = null;
    private messageHandler: MessageHandler | null = null;
    private stateGetter: StateGetter | null = null;

    constructor(private readonly extensionUri: vscode.Uri) {}

    setMessageHandler(handler: MessageHandler): void {
        this.messageHandler = handler;
    }

    setStateGetter(getter: StateGetter): void {
        this.stateGetter = getter;
    }

    updateState(data: TrackerState): void {
        this.view?.webview.postMessage({ type: 'state', ...data });
    }

    sendToast(message: string): void {
        this.view?.webview.postMessage({ type: 'toast', message });
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [],
        };

        // Cryptographically secure nonce for the Content Security Policy
        const nonce = crypto.randomBytes(16).toString('base64');

        webviewView.webview.html = this.getHtml(nonce);

        webviewView.webview.onDidReceiveMessage((msg: Record<string, unknown>) => {
            // Webview signals it finished loading — push current state immediately
            if (msg.type === 'ready') {
                if (this.stateGetter) this.updateState(this.stateGetter());
                return;
            }
            this.messageHandler?.(msg);
        });

        // Re-push state when the panel becomes visible again (e.g. after tab switch)
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && this.stateGetter) {
                this.updateState(this.stateGetter());
            }
        });
    }

    // -------------------------------------------------------------------------
    // HTML
    // -------------------------------------------------------------------------

    private getHtml(nonce: string): string {
        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
        font-family: var(--vscode-font-family);
        font-size: var(--vscode-font-size);
        color: var(--vscode-foreground);
        background: var(--vscode-sideBar-background);
        padding: 12px;
        opacity: 0;
        transition: opacity 0.15s ease;
    }
    body.ready { opacity: 1; }
    h3 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--vscode-sideBarSectionHeader-foreground);
        margin-bottom: 8px;
        font-weight: 600;
    }
    .section { margin-bottom: 16px; }
    input[type="password"], input[type="text"] {
        width: 100%;
        padding: 4px 8px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 2px;
        outline: none;
        font-size: var(--vscode-font-size);
        font-family: var(--vscode-font-family);
    }
    input:focus { border-color: var(--vscode-focusBorder); }
    button {
        width: 100%;
        padding: 4px 12px;
        margin-top: 6px;
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        border: none;
        border-radius: 2px;
        cursor: pointer;
        font-size: var(--vscode-font-size);
        font-family: var(--vscode-font-family);
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
        background: var(--vscode-button-secondaryBackground);
        color: var(--vscode-button-secondaryForeground);
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .tracking-stop  { background: rgba(244, 67, 54, 0.15); color: #f44336; }
    .tracking-stop:hover  { background: rgba(244, 67, 54, 0.25); }
    .tracking-start { background: rgba(76, 175, 80, 0.15);  color: #4caf50; }
    .tracking-start:hover { background: rgba(76, 175, 80, 0.25); }
    .disconnect-link {
        display: block;
        text-align: center;
        margin-top: 12px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        cursor: pointer;
    }
    .disconnect-link:hover { color: var(--vscode-errorForeground); }
    .stat-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        font-size: 12px;
    }
    .stat-label { color: var(--vscode-descriptionForeground); }
    .stat-value { font-weight: 600; }
    .toggle-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        font-size: 12px;
    }
    .toggle-row span { color: var(--vscode-foreground); }
    /* Toggle switch */
    .switch { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; position: absolute; }
    .switch .slider {
        position: absolute;
        inset: 0;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.1));
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
    }
    .switch .slider::after {
        content: '';
        position: absolute;
        top: 2px; left: 2px;
        width: 14px; height: 14px;
        background: var(--vscode-descriptionForeground);
        border-radius: 50%;
        transition: transform 0.2s, background 0.2s;
    }
    .switch input:checked + .slider { background: var(--vscode-button-background); border-color: var(--vscode-button-background); }
    .switch input:checked + .slider::after { transform: translateX(16px); background: var(--vscode-button-foreground); }
    .switch input:focus-visible + .slider { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }
    /* Inline status input */
    .status-row {
        display: flex;
        align-items: center;
        margin-top: 4px;
        background: var(--vscode-input-background);
        border: 1px solid var(--vscode-input-border, transparent);
        border-radius: 4px;
        overflow: hidden;
        transition: border-color 0.15s;
    }
    .status-row:focus-within { border-color: var(--vscode-focusBorder); }
    .status-row input { flex: 1; background: transparent; border: none; border-radius: 0; padding: 6px 8px; }
    .status-row input:focus { border-color: transparent; }
    .status-row button {
        width: auto; margin: 0; padding: 6px 10px; border-radius: 0;
        background: transparent; color: var(--vscode-descriptionForeground);
        font-size: 11px; transition: color 0.15s, background 0.15s;
    }
    .status-row button:hover { color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
    /* Links */
    .link {
        color: var(--vscode-textLink-foreground);
        text-decoration: none;
        font-size: 11px;
        display: inline-block;
        margin-top: 6px;
        cursor: pointer;
    }
    .link:hover { text-decoration: underline; }
    /* Toast */
    .toast {
        position: fixed;
        bottom: 12px; left: 12px; right: 12px;
        padding: 7px 10px;
        background: var(--vscode-notificationCenterHeader-background, #2d2d30);
        border: 1px solid var(--vscode-widget-border, #444);
        border-radius: 4px;
        font-size: 11px;
        color: var(--vscode-foreground);
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        opacity: 0;
        transform: translateY(6px);
        transition: opacity 0.2s ease, transform 0.2s ease;
        pointer-events: none;
        z-index: 100;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .separator {
        border: none;
        border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-widget-border, #333));
        margin: 12px 0;
    }
    button:disabled { opacity: 0.35; cursor: not-allowed; }
    .hidden { display: none; }
</style>
</head>
<body>

    <!-- Not connected -->
    <div id="login-section">
        <div class="section">
            <h3>Connect to DevGlobe</h3>
            <input type="password" id="token-input" placeholder="Paste your API key" />
            <button id="connect-btn">Connect</button>
            <a class="link" id="get-key-link">Get your API key on devglobe.xyz</a>
        </div>
    </div>

    <!-- Connected -->
    <div id="dashboard-section" class="hidden">
        <div class="section">
            <h3>Dashboard</h3>
            <div class="stat-row">
                <span class="stat-label">Coding today</span>
                <span class="stat-value" id="coding-time">0m</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Language</span>
                <span class="stat-value" id="active-lang">--</span>
            </div>
        </div>

        <hr class="separator" />

        <div class="section">
            <h3>Preferences</h3>
            <div class="toggle-row">
                <span>Share repository</span>
                <label class="switch">
                    <input type="checkbox" id="toggle-share-repo" />
                    <span class="slider"></span>
                </label>
            </div>
            <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; line-height: 1.4;">
                Your coding time and commits are always tracked. This toggle controls
                whether your repository name is visible on the globe.
            </div>
            <div class="toggle-row" style="margin-top: 8px;">
                <span>Anonymous mode</span>
                <label class="switch">
                    <input type="checkbox" id="toggle-anonymous" />
                    <span class="slider"></span>
                </label>
            </div>
            <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px; line-height: 1.4;">
                Your real location is never sent to the server. Each heartbeat places you randomly among the 50 largest cities in your country. If you live in a major city, you may occasionally appear there by chance — this is normal and expected.
            </div>
        </div>

        <hr class="separator" />

        <div class="section">
            <h3>Status Message</h3>
            <div class="status-row">
                <input type="text" id="status-input" placeholder="What are you working on?" maxlength="100" />
                <button class="secondary" id="status-btn">Set</button>
            </div>
        </div>

        <hr class="separator" />

        <div class="section">
            <div style="display: flex; gap: 6px;">
                <button id="btn-stop"  class="tracking-stop"  style="flex: 1; padding: 3px 8px; font-size: 11px;">Stop Tracking</button>
                <button id="btn-start" class="tracking-start" style="flex: 1; padding: 3px 8px; font-size: 11px;">Start Tracking</button>
            </div>
            <a class="link disconnect-link" id="disconnect-btn">Disconnect</a>
        </div>
    </div>

    <div id="toast" class="toast"></div>

<script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    // Elements
    const loginSection     = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const tokenInput       = document.getElementById('token-input');
    const connectBtn       = document.getElementById('connect-btn');
    const getKeyLink       = document.getElementById('get-key-link');
    const codingTime       = document.getElementById('coding-time');
    const activeLang       = document.getElementById('active-lang');
    const toggleShareRepo  = document.getElementById('toggle-share-repo');
    const toggleAnonymous  = document.getElementById('toggle-anonymous');
    const statusInput      = document.getElementById('status-input');
    const statusBtn        = document.getElementById('status-btn');
    const btnStop          = document.getElementById('btn-stop');
    const btnStart         = document.getElementById('btn-start');
    const disconnectBtn    = document.getElementById('disconnect-btn');
    const toast            = document.getElementById('toast');
    let toastTimer         = null;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- Outgoing messages ---

    connectBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (token) vscode.postMessage({ type: 'saveToken', token });
    });

    tokenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') connectBtn.click();
    });

    getKeyLink.addEventListener('click', () => {
        vscode.postMessage({ type: 'openExternal', url: 'https://devglobe.xyz' });
    });

    toggleShareRepo.addEventListener('change', () => {
        vscode.postMessage({ type: 'toggle', key: 'shareRepo', value: toggleShareRepo.checked });
    });

    toggleAnonymous.addEventListener('change', () => {
        vscode.postMessage({ type: 'toggle', key: 'anonymousMode', value: toggleAnonymous.checked });
    });

    statusBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'setStatus', message: statusInput.value });
    });

    statusInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') statusBtn.click();
    });

    btnStop.addEventListener('click',  () => vscode.postMessage({ type: 'stopTracking' }));
    btnStart.addEventListener('click', () => vscode.postMessage({ type: 'startTracking' }));

    disconnectBtn.addEventListener('click', () => vscode.postMessage({ type: 'disconnect' }));

    // Notify extension when the browser detects network restoration
    window.addEventListener('online', () => vscode.postMessage({ type: 'networkRestored' }));

    // Signal to the extension that this webview is ready to receive state
    vscode.postMessage({ type: 'ready' });

    // --- Incoming messages ---

    window.addEventListener('message', (event) => {
        const msg = event.data;

        if (msg.type === 'toast') {
            showToast(msg.message);
            return;
        }

        if (msg.type === 'state') {
            document.body.classList.add('ready');

            if (msg.connected) {
                loginSection.classList.add('hidden');
                dashboardSection.classList.remove('hidden');
                codingTime.textContent  = msg.codingTime || '0m';
                activeLang.textContent  = msg.language   || '--';
                toggleShareRepo.checked = msg.shareRepo  === true;
                toggleAnonymous.checked = msg.anonymousMode === true;
                statusInput.value = msg.statusMessage || '';
                btnStop.disabled  = !msg.tracking;
                btnStart.disabled = !!msg.tracking;
            } else {
                loginSection.classList.remove('hidden');
                dashboardSection.classList.add('hidden');
                tokenInput.value = '';
            }
        }
    });
</script>
</body>
</html>`;
    }
}
