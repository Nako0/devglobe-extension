import * as vscode from 'vscode';
import { initLogger, log } from './logger';
import { Tracker } from './tracker';
import { DevGlobeSidebarProvider } from './sidebar';
import { updateStatusMessage } from './heartbeat';
import { resetAnonymousLocation } from './geo';

// Keys the sidebar is allowed to toggle — prevents arbitrary config modification
const ALLOWED_TOGGLE_KEYS = new Set(['shareRepo', 'anonymousMode']);

// SecretStorage key for the API key (stored in the OS keychain)
const SECRET_API_KEY = 'devglobe.apiKey';

/**
 * Reads the API key from SecretStorage.
 * On first run, migrates from the old plain-text settings.json if present.
 */
async function getApiKey(context: vscode.ExtensionContext): Promise<string> {
    const stored = await context.secrets.get(SECRET_API_KEY);
    if (stored) return stored;

    // Migration: move plain-text key from settings.json → OS keychain
    const config = vscode.workspace.getConfiguration('devglobe');
    const legacy = config.get<string>('apiKey', '');
    if (legacy) {
        await context.secrets.store(SECRET_API_KEY, legacy);
        await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
        log.info('API key migrated from settings.json to secure storage');
        return legacy;
    }
    return '';
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    // Enable verbose logging only when running in the extension development host
    initLogger(context.extensionMode === vscode.ExtensionMode.Development);
    log.info('DevGlobe activating…');

    // -------------------------------------------------------------------------
    // Sidebar
    // -------------------------------------------------------------------------

    const sidebar = new DevGlobeSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            DevGlobeSidebarProvider.viewType,
            sidebar,
            { webviewOptions: { retainContextWhenHidden: true } },
        )
    );

    // -------------------------------------------------------------------------
    // Tracker
    // -------------------------------------------------------------------------

    const tracker = new Tracker(context, (state) => sidebar.updateState(state));

    // Allow the sidebar to pull the current state whenever it (re)appears
    sidebar.setStateGetter(() => tracker.getState());

    // -------------------------------------------------------------------------
    // Sidebar message handler
    // -------------------------------------------------------------------------

    sidebar.setMessageHandler(async (msg) => {
        const config = vscode.workspace.getConfiguration('devglobe');

        switch (msg.type as string) {

            case 'saveToken': {
                const token = String(msg.token ?? '').trim();
                if (!token || !token.startsWith('devglobe_')) {
                    vscode.window.showErrorMessage('DevGlobe: Invalid API key — it should start with "devglobe_".');
                    break;
                }
                await context.secrets.store(SECRET_API_KEY, token);
                const savedConf = vscode.workspace.getConfiguration('devglobe');
                tracker.restoreConnected(token, savedConf);
                sidebar.updateState(tracker.getState());
                vscode.window.showInformationMessage('DevGlobe: Connected! Click "Start Tracking" to go live.');
                break;
            }

            case 'toggle': {
                const key = String(msg.key ?? '');
                if (!ALLOWED_TOGGLE_KEYS.has(key)) break;
                const value = Boolean(msg.value);
                await config.update(key, value, vscode.ConfigurationTarget.Global);
                tracker.updatePreference(key as keyof ReturnType<typeof tracker.getState>, value);
                if (key === 'anonymousMode') resetAnonymousLocation();
                break;
            }

            case 'setStatus': {
                const apiKey = await getApiKey(context);
                const message = String(msg.message ?? '');
                if (!apiKey) break;
                const ok = await updateStatusMessage(apiKey, message);
                if (ok) {
                    tracker.setStatusMessage(message);
                    vscode.window.showInformationMessage(
                        message ? `DevGlobe: Status set to "${message}"` : 'DevGlobe: Status cleared'
                    );
                } else {
                    vscode.window.showErrorMessage('DevGlobe: Failed to update status');
                }
                break;
            }

            case 'stopTracking': {
                await config.update('trackingEnabled', false, vscode.ConfigurationTarget.Global);
                tracker.pause();
                vscode.window.showInformationMessage('DevGlobe: Tracking stopped.');
                break;
            }

            case 'startTracking': {
                const apiKey = await getApiKey(context);
                if (!apiKey) break;
                await config.update('trackingEnabled', true, vscode.ConfigurationTarget.Global);
                tracker.start(apiKey);
                vscode.window.showInformationMessage('DevGlobe: Tracking started.');
                break;
            }

            case 'disconnect': {
                await context.secrets.delete(SECRET_API_KEY);
                tracker.reset();
                vscode.window.showInformationMessage('DevGlobe: Disconnected.');
                break;
            }

            case 'networkRestored': {
                tracker.handleNetworkRestored();
                break;
            }

            case 'openExternal': {
                // Only allow https:// and http:// URLs
                const url = String(msg.url ?? '');
                if (!url.startsWith('https://') && !url.startsWith('http://')) break;
                vscode.env.openExternal(vscode.Uri.parse(url));
                break;
            }
        }
    });

    // -------------------------------------------------------------------------
    // Activity tracking
    // -------------------------------------------------------------------------

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(() => tracker.recordActivity())
    );

    // -------------------------------------------------------------------------
    // "Set Status" command (accessible from the command palette)
    // -------------------------------------------------------------------------

    context.subscriptions.push(
        vscode.commands.registerCommand('devglobe.setStatus', async () => {
            const apiKey = await getApiKey(context);
            if (!apiKey) return;

            const message = await vscode.window.showInputBox({
                prompt: 'Set your DevGlobe status message',
                placeHolder: 'What are you working on?',
                validateInput: (v) => (v.length > 100 ? 'Max 100 characters' : null),
            });

            if (message === undefined) return; // user cancelled

            const ok = await updateStatusMessage(apiKey, message);
            if (ok) {
                tracker.setStatusMessage(message);
                vscode.window.showInformationMessage(
                    message ? `DevGlobe: Status set to "${message}"` : 'DevGlobe: Status cleared'
                );
            } else {
                vscode.window.showErrorMessage('DevGlobe: Failed to update status');
            }
        })
    );

    // -------------------------------------------------------------------------
    // Auto-start
    // -------------------------------------------------------------------------

    const savedConfig = vscode.workspace.getConfiguration('devglobe');
    const apiKey = await getApiKey(context);
    const trackingEnabled = savedConfig.get<boolean>('trackingEnabled', true);

    if (apiKey && trackingEnabled) {
        tracker.start(apiKey);
    } else if (apiKey) {
        // Key exists but tracking was explicitly paused — show dashboard without tracking
        tracker.restoreConnected(apiKey, savedConfig);
        sidebar.updateState(tracker.getState());
    } else {
        sidebar.updateState(tracker.getState());
    }

    log.info('DevGlobe activated.');
}

export function deactivate(): void {
    // no cleanup needed
}
