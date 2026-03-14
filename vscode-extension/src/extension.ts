import * as vscode from 'vscode';
import { initLogger, log } from './logger';
import { CoreClient, mapLanguageId } from './core-client';
import { DevGlobeSidebarProvider } from './sidebar';

const ALLOWED_TOGGLE_KEYS = new Set(['shareRepo', 'anonymousMode']);
const SECRET_API_KEY = 'devglobe.apiKey';

async function getApiKey(context: vscode.ExtensionContext): Promise<string> {
    const stored = await context.secrets.get(SECRET_API_KEY);
    if (stored) return stored;

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
    initLogger(context.extensionMode === vscode.ExtensionMode.Development);
    log.info('DevGlobe activating…');

    const sidebar = new DevGlobeSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            DevGlobeSidebarProvider.viewType,
            sidebar,
            { webviewOptions: { retainContextWhenHidden: true } },
        )
    );

    const client = new CoreClient(context, (state) => sidebar.updateState(state));
    sidebar.setStateGetter(() => client.getState());

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
                client.init(token, savedConf);
                sidebar.updateState(client.getState());
                vscode.window.showInformationMessage('DevGlobe: Connected! Click "Start Tracking" to go live.');
                break;
            }

            case 'toggle': {
                const key = String(msg.key ?? '');
                if (!ALLOWED_TOGGLE_KEYS.has(key)) break;
                const value = Boolean(msg.value);
                client.updatePreference(key as keyof ReturnType<typeof client.getState>, value);
                client.setConfig(key, value);
                await config.update(key, value, vscode.ConfigurationTarget.Global);
                break;
            }

            case 'setStatus': {
                const message = String(msg.message ?? '');
                client.setStatus(message);
                break;
            }

            case 'stopTracking': {
                await config.update('trackingEnabled', false, vscode.ConfigurationTarget.Global);
                client.pause();
                vscode.window.showInformationMessage('DevGlobe: Tracking stopped.');
                break;
            }

            case 'startTracking': {
                const apiKey = await getApiKey(context);
                if (!apiKey) break;
                await config.update('trackingEnabled', true, vscode.ConfigurationTarget.Global);
                client.init(apiKey, config);
                client.start();
                vscode.window.showInformationMessage('DevGlobe: Tracking started.');
                break;
            }

            case 'disconnect': {
                await context.secrets.delete(SECRET_API_KEY);
                client.reset();
                vscode.window.showInformationMessage('DevGlobe: Disconnected.');
                break;
            }

            case 'networkRestored': {
                break;
            }

            case 'openExternal': {
                const url = String(msg.url ?? '');
                if (!url.startsWith('https://') && !url.startsWith('http://')) break;
                vscode.env.openExternal(vscode.Uri.parse(url));
                break;
            }
        }
    });

    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((e) => {
            const filePath = e.document.uri.fsPath;
            const cwd = require('path').dirname(filePath);
            const language = mapLanguageId(e.document.languageId);
            client.activity(filePath, cwd, language);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('devglobe.setStatus', async () => {
            const apiKey = await getApiKey(context);
            if (!apiKey) return;

            const message = await vscode.window.showInputBox({
                prompt: 'Set your DevGlobe status message',
                placeHolder: 'What are you working on?',
                validateInput: (v) => (v.length > 100 ? 'Max 100 characters' : null),
            });

            if (message === undefined) return;
            client.setStatus(message);
        })
    );

    const savedConfig = vscode.workspace.getConfiguration('devglobe');
    const apiKey = await getApiKey(context);
    const trackingEnabled = savedConfig.get<boolean>('trackingEnabled', true);

    if (apiKey && trackingEnabled) {
        client.init(apiKey, savedConfig);
        client.start();
    } else if (apiKey) {
        client.init(apiKey, savedConfig);
        sidebar.updateState(client.getState());
    } else {
        sidebar.updateState(client.getState());
    }

    log.info('DevGlobe activated.');
}

export function deactivate(): void {
    // CoreClient.dispose() handles cleanup via context.subscriptions
}
