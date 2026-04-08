import * as vscode from 'vscode';
import cityCenters from '../../devglobe-core/data/city-centers.json';
import { DEFAULT_STATE, TrackerState, detectEditor } from './client-shared';

const SUPABASE_URL = 'https://kzcrtlbspkhlnjillhyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk';

const HEARTBEAT_INTERVAL = 30_000;
const ACTIVITY_TIMEOUT = 60_000;
const GEO_CACHE_TTL = 60 * 60 * 1000;
const GIT_CACHE_TTL = 5 * 60 * 1000;
const OFFLINE_THRESHOLD = 2;
const FETCH_TIMEOUT_MS = 15_000;
const GEO_TIMEOUT_MS = 10_000;

const HEADERS = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

type GeoResult = {
    city: string | null;
    lat: number | null;
    lon: number | null;
    countryCode: string | null;
    countryName: string | null;
};

type CityCentersMap = Record<string, Record<string, [number, number]>>;

type GitRemote = {
    name: string;
    fetchUrl?: string;
    pushUrl?: string;
};

type GitRepository = {
    rootUri: vscode.Uri;
    state: {
        remotes: GitRemote[];
    };
};

type GitApi = {
    repositories: GitRepository[];
};

type GitExtension = {
    getAPI(version: 1): GitApi;
};

class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

class ApiError extends Error {
    constructor(public readonly status: number, body: string) {
        super(`HTTP ${status}: ${body}`);
        this.name = 'ApiError';
    }
}

function formatTime(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function detectPlatformFromUserAgent(): string {
    const nav = globalThis.navigator;
    const userAgentDataPlatform = (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ?? '';
    const raw = `${userAgentDataPlatform} ${nav.userAgent} ${nav.platform}`.toLowerCase();

    if (raw.includes('windows') || raw.includes('win32') || raw.includes('win64')) return 'Windows';
    if (raw.includes('mac os') || raw.includes('macintosh') || raw.includes('macintel')) return 'macOS';
    if (raw.includes('linux') || raw.includes('x11') || raw.includes('cros')) return 'Linux';
    if (raw.includes('android')) return 'Android';
    if (raw.includes('iphone') || raw.includes('ipad') || raw.includes('ios')) return 'iOS';

    return 'Unknown';
}

function normalizeCity(name: string): string {
    return name
        .replace(/\s*\(.*\)$/, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function distanceDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = lat1 - lat2;
    const dLon = (lon1 - lon2) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    return Math.sqrt(dLat ** 2 + dLon ** 2);
}

function validCoords(lat: number, lon: number): boolean {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function toNumber(v: unknown): number | null {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
        const n = parseFloat(v);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function titleCase(s: string): string {
    return s.replace(/(?:^|[\s-])\S/g, (c) => c.toUpperCase());
}

function parseRepoUrl(url: string): string | null {
    const sshMatch = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (sshMatch) return sshMatch[1];

    try {
        const parsed = new URL(url);
        const p = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '');
        if (p.includes('/')) return p;
    } catch {
        return null;
    }

    return null;
}

async function fetchJson(url: string): Promise<unknown | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export class WebCoreClient implements vscode.Disposable {
    private state: TrackerState = { ...DEFAULT_STATE };
    private statusBarItem: vscode.StatusBarItem | null = null;

    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    private lastActivity = 0;
    private consecutiveNetErrors = 0;
    private currentApiKey: string | null = null;
    private editor = 'unknown';
    private ticking = false;
    private last5xxWarning = 0;

    private lastWorkspacePath: string | null = null;
    private lastFilePath: string | null = null;
    private lastLanguage: string | null = null;

    private geoCache: GeoResult | null = null;
    private geoFetchedAt = 0;
    private anonymousGeoCache: GeoResult | null = null;

    private repoCacheWorkspacePath: string | null = null;
    private repoCacheValue: string | null = null;
    private repoFetchedAt = 0;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly onStateChange: (state: TrackerState) => void,
    ) {
        context.subscriptions.push(this);
    }

    dispose(): void {
        this.clearTimer();
        this.statusBarItem?.dispose();
        this.statusBarItem = null;
    }

    getState(): TrackerState {
        return { ...this.state };
    }

    init(apiKey: string, config: vscode.WorkspaceConfiguration): void {
        this.currentApiKey = apiKey;
        this.editor = detectEditor();

        this.state.connected = true;
        this.state.shareRepo = config.get('shareRepo', false);
        this.state.anonymousMode = config.get('anonymousMode', false);
        this.state.statusMessage = config.get('statusMessage', '');

        this.pushState();
    }

    start(): void {
        if (!this.currentApiKey) return;

        this.ensureStatusBar();
        this.clearTimer();
        this.resetAnonymousLocation();

        this.consecutiveNetErrors = 0;
        this.state.connected = true;
        this.state.tracking = true;
        this.state.offline = false;
        this.pushState();

        this.lastActivity = Date.now();
        const apiKey = this.currentApiKey;

        this.heartbeatTimer = setInterval(() => {
            if (Date.now() - this.lastActivity > ACTIVITY_TIMEOUT) return;
            void this.tick(apiKey);
        }, HEARTBEAT_INTERVAL);

        void this.tick(apiKey);
    }

    pause(): void {
        this.clearTimer();
        this.state.tracking = false;
        this.pushState();
        this.statusBarItem?.hide();
    }

    activity(filePath: string, cwd: string, language?: string): void {
        this.lastActivity = Date.now();
        this.lastFilePath = filePath;
        this.lastWorkspacePath = cwd;
        if (language) this.lastLanguage = language;
    }

    setConfig(key: string, value: boolean): void {
        if (key === 'shareRepo') this.state.shareRepo = value;
        if (key === 'anonymousMode' && value !== this.state.anonymousMode) {
            this.state.anonymousMode = value;
            this.resetAnonymousLocation();
        }
        this.pushState();
    }

    setStatus(message: string): void {
        void this.setStatusInternal(message);
    }

    reset(): void {
        this.clearTimer();
        this.currentApiKey = null;
        this.state = { ...DEFAULT_STATE };
        this.statusBarItem?.hide();
        this.onStateChange(this.state);
    }

    updatePreference(key: keyof TrackerState, value: boolean): void {
        (this.state as unknown as Record<string, unknown>)[key] = value;
        this.onStateChange(this.state);
    }

    private async setStatusInternal(message: string): Promise<void> {
        if (!this.currentApiKey) return;

        const ok = await this.updateStatusMessage(this.currentApiKey, message);
        if (ok) {
            this.state.statusMessage = message;
            this.pushState();
            vscode.window.showInformationMessage(
                message ? `DevGlobe: Status set to "${message}"` : 'DevGlobe: Status cleared',
            );
        } else {
            vscode.window.showErrorMessage('DevGlobe: Failed to update status');
        }
    }

    private async tick(apiKey: string): Promise<void> {
        if (this.ticking) return;
        this.ticking = true;

        try {
            const result = await this.sendHeartbeat({
                apiKey,
                editor: this.editor,
                anonymous: this.state.anonymousMode,
                shareRepo: this.state.shareRepo,
                filePath: this.lastFilePath ?? undefined,
                cwd: this.lastWorkspacePath ?? undefined,
                language: this.lastLanguage,
            });

            this.consecutiveNetErrors = 0;
            if (this.state.offline) {
                this.state.offline = false;
                this.pushState();
                vscode.window.showInformationMessage('DevGlobe: Network restored');
            }

            this.state.codingTime = formatTime(result.todaySeconds);
            this.state.language = result.language;
            this.pushState();
            this.updateStatusBarTime(result.todaySeconds);
        } catch (e) {
            if (e instanceof NetworkError) {
                this.consecutiveNetErrors++;
                if (this.consecutiveNetErrors >= OFFLINE_THRESHOLD && !this.state.offline) {
                    this.state.offline = true;
                    this.pushState();
                    vscode.window.showWarningMessage('DevGlobe: No network - tracking paused');
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

    private async sendHeartbeat(params: {
        apiKey: string;
        editor: string;
        anonymous: boolean;
        shareRepo: boolean;
        filePath?: string;
        cwd?: string;
        language?: string | null;
    }): Promise<{ todaySeconds: number; language: string | null }> {
        const [geo, repo] = await Promise.all([
            this.fetchGeolocation(params.anonymous),
            this.detectRepo(params.cwd, params.filePath),
        ]);

        const body: Record<string, unknown> = {
            p_key: params.apiKey,
            p_editor: params.editor,
            p_anonymous: params.anonymous,
            p_share_repo: params.shareRepo,
            p_platform: detectPlatformFromUserAgent(),
        };

        if (geo) {
            if (geo.city) body.p_city = geo.city;
            if (geo.lat != null) body.p_lat = geo.lat;
            if (geo.lon != null) body.p_lng = geo.lon;
        }

        if (params.language) body.p_lang = params.language;
        if (repo && params.shareRepo) body.p_repo = repo;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        let res: Response;
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

        const data = (await res.json()) as { today_seconds?: number };
        return {
            todaySeconds: data.today_seconds ?? 0,
            language: params.language ?? null,
        };
    }

    private async updateStatusMessage(apiKey: string, message: string): Promise<boolean> {
        const truncated = message.slice(0, 100);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/update_status_message`, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({ p_key: apiKey, p_message: truncated }),
                signal: controller.signal,
            });
            return res.ok;
        } catch {
            return false;
        } finally {
            clearTimeout(timer);
        }
    }

    private async detectRepo(cwd?: string, filePath?: string): Promise<string | null> {
        const cacheKey = cwd ?? filePath ?? null;
        if (cacheKey && cacheKey === this.repoCacheWorkspacePath && Date.now() - this.repoFetchedAt < GIT_CACHE_TTL) {
            return this.repoCacheValue;
        }

        const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (!extension) return null;

        if (!extension.isActive) {
            await extension.activate();
        }

        const api = extension.exports?.getAPI?.(1);
        if (!api || api.repositories.length === 0) {
            this.repoCacheWorkspacePath = cacheKey;
            this.repoFetchedAt = Date.now();
            this.repoCacheValue = null;
            return null;
        }

        const target = (filePath ?? cwd ?? '').toLowerCase();
        const repositories = [...api.repositories].sort(
            (a, b) => b.rootUri.path.length - a.rootUri.path.length,
        );

        const repo =
            repositories.find((r) => target.startsWith(r.rootUri.path.toLowerCase()))
            ?? repositories[0];

        const remote = repo.state.remotes.find((r) => r.name === 'origin') ?? repo.state.remotes[0];
        const remoteUrl = remote?.fetchUrl ?? remote?.pushUrl ?? null;

        this.repoCacheWorkspacePath = cacheKey;
        this.repoFetchedAt = Date.now();
        this.repoCacheValue = remoteUrl ? parseRepoUrl(remoteUrl) : null;

        return this.repoCacheValue;
    }

    private async fetchGeolocation(anonymous: boolean): Promise<GeoResult | null> {
        if (this.geoCache && Date.now() - this.geoFetchedAt < GEO_CACHE_TTL) {
            return anonymous ? this.getAnonymousLocation(this.geoCache) : this.geoCache;
        }

        const next =
            (await this.fromFreeIpApi())
            ?? (await this.fromIpApiCo())
            ?? (await this.fromIpWhoIs());

        if (!next) {
            if (!this.geoCache) return null;
            return anonymous ? this.getAnonymousLocation(this.geoCache) : this.geoCache;
        }

        this.geoCache = next;
        this.geoFetchedAt = Date.now();
        return anonymous ? this.getAnonymousLocation(next) : next;
    }

    private resetAnonymousLocation(): void {
        this.anonymousGeoCache = null;
    }

    private getAnonymousLocation(geo: GeoResult): GeoResult {
        if (this.anonymousGeoCache && this.anonymousGeoCache.countryCode === geo.countryCode) {
            return this.anonymousGeoCache;
        }

        const code = geo.countryCode?.toUpperCase() ?? '';
        const country = (cityCenters as CityCentersMap)[code];
        const keys = country ? Object.keys(country) : [];

        if (keys.length > 0) {
            const key = keys[Math.floor(Math.random() * keys.length)];
            const [lat, lon] = country[key];
            const cityDisplay = titleCase(key);
            this.anonymousGeoCache = {
                city: geo.countryName ? `${cityDisplay}, ${geo.countryName}` : cityDisplay,
                lat,
                lon,
                countryCode: geo.countryCode,
                countryName: geo.countryName,
            };
        } else {
            this.anonymousGeoCache = {
                city: null,
                lat: null,
                lon: null,
                countryCode: geo.countryCode,
                countryName: geo.countryName,
            };
        }

        return this.anonymousGeoCache;
    }

    private snapToCity(
        cityName: string | null | undefined,
        countryCode: string | null | undefined,
        lat: number,
        lon: number,
    ): [number, number] {
        if (cityName && countryCode) {
            const country = (cityCenters as CityCentersMap)[countryCode.toUpperCase()];
            if (country) {
                const center = country[normalizeCity(cityName)];
                if (center && distanceDeg(lat, lon, center[0], center[1]) < 2) {
                    return center;
                }
            }
        }

        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * 0.18;
        const dLat = r * Math.cos(angle);
        const dLon = (r * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180);
        return [round1(lat + dLat), round1(lon + dLon)];
    }

    private async fromFreeIpApi(): Promise<GeoResult | null> {
        const data = (await fetchJson('https://free.freeipapi.com/api/json')) as {
            cityName?: string;
            countryName?: string;
            countryCode?: string;
            latitude?: unknown;
            longitude?: unknown;
        } | null;

        if (!data) return null;

        const lat = toNumber(data.latitude);
        const lon = toNumber(data.longitude);
        if (lat == null || lon == null || !validCoords(lat, lon)) return null;

        const city =
            data.cityName && data.countryName
                ? `${data.cityName}, ${data.countryName}`
                : (data.cityName ?? data.countryName ?? null);

        const [snappedLat, snappedLon] = this.snapToCity(data.cityName, data.countryCode, lat, lon);

        return {
            city,
            lat: snappedLat,
            lon: snappedLon,
            countryCode: data.countryCode ?? null,
            countryName: data.countryName ?? null,
        };
    }

    private async fromIpApiCo(): Promise<GeoResult | null> {
        const data = (await fetchJson('https://ipapi.co/json/')) as {
            city?: string;
            country_name?: string;
            country_code?: string;
            latitude?: unknown;
            longitude?: unknown;
        } | null;

        if (!data) return null;

        const lat = toNumber(data.latitude);
        const lon = toNumber(data.longitude);
        if (lat == null || lon == null || !validCoords(lat, lon)) return null;

        const city =
            data.city && data.country_name
                ? `${data.city}, ${data.country_name}`
                : (data.city ?? data.country_name ?? null);

        const [snappedLat, snappedLon] = this.snapToCity(data.city, data.country_code, lat, lon);

        return {
            city,
            lat: snappedLat,
            lon: snappedLon,
            countryCode: data.country_code ?? null,
            countryName: data.country_name ?? null,
        };
    }

    private async fromIpWhoIs(): Promise<GeoResult | null> {
        const data = (await fetchJson('https://ipwho.is/')) as {
            success?: boolean;
            city?: string;
            country?: string;
            country_code?: string;
            latitude?: unknown;
            longitude?: unknown;
        } | null;

        if (!data || data.success === false) return null;

        const lat = toNumber(data.latitude);
        const lon = toNumber(data.longitude);
        if (lat == null || lon == null || !validCoords(lat, lon)) return null;

        const city =
            data.city && data.country
                ? `${data.city}, ${data.country}`
                : (data.city ?? data.country ?? null);

        const [snappedLat, snappedLon] = this.snapToCity(data.city, data.country_code, lat, lon);

        return {
            city,
            lat: snappedLat,
            lon: snappedLon,
            countryCode: data.country_code ?? null,
            countryName: data.country ?? null,
        };
    }

    private ensureStatusBar(): void {
        if (this.statusBarItem) return;

        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.tooltip = 'DevGlobe: Coding time today';
        this.statusBarItem.text = '$(clock) 0m';
        this.statusBarItem.show();
        this.context.subscriptions.push(this.statusBarItem);
    }

    private updateStatusBar(): void {
        if (!this.statusBarItem) return;

        if (this.state.tracking) {
            this.statusBarItem.text = `$(clock) ${this.state.codingTime}`;
            this.statusBarItem.tooltip = `DevGlobe: ${this.state.codingTime} coded today`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    private updateStatusBarTime(todaySeconds: number): void {
        if (!this.statusBarItem) return;

        const label = formatTime(todaySeconds);
        this.statusBarItem.text = `$(clock) ${label}`;
        this.statusBarItem.tooltip = `DevGlobe: ${label} coded today`;
        this.statusBarItem.show();
    }

    private clearTimer(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private pushState(): void {
        this.updateStatusBar();
        this.onStateChange({ ...this.state });
    }
}
