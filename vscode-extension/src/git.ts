import * as path from 'path';
import { exec } from 'child_process';
import * as vscode from 'vscode';
import { log } from './logger';

/** Cache TTL for repo detection (5 minutes). */
const REPO_CACHE_TTL = 5 * 60 * 1000;

/** Cached repo detection. */
let cachedRepo: string | null = null;
let cachedRepoCwd: string | null = null;
let repoFetchedAt = 0;

/** Last known remote ref hash — used to detect new pushes. */
let lastRemoteHash: string | null = null;

/** Pending commit stats detected by the file watcher. */
let pendingStats: { insertions: number; deletions: number } | null = null;

/** Active file watcher disposable. */
let headWatcher: vscode.Disposable | null = null;
let watchedGitDir: string | null = null;

/**
 * Promisified exec with timeout. Resolves to trimmed stdout or null on error.
 */
function execAsync(cmd: string, cwd: string, timeout: number): Promise<string | null> {
    return new Promise((resolve) => {
        exec(cmd, { cwd, encoding: 'utf8', timeout }, (err, stdout) => {
            if (err) { resolve(null); return; }
            resolve((stdout ?? '').trim());
        });
    });
}

/**
 * Returns the working directory of the currently active file.
 */
function getActiveCwd(): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    return path.dirname(editor.document.uri.fsPath);
}

/**
 * Finds the .git directory for a given working directory.
 */
async function findGitDir(cwd: string): Promise<string | null> {
    const result = await execAsync('git rev-parse --git-dir', cwd, 5000);
    if (!result) return null;
    return path.isAbsolute(result) ? result : path.resolve(cwd, result);
}

/**
 * Sets up a file watcher on the remote tracking refs.
 * Watches refs/remotes/origin/ so stats are only collected after a push.
 */
async function setupWatcher(cwd: string): Promise<void> {
    const gitDir = await findGitDir(cwd);
    if (!gitDir || gitDir === watchedGitDir) return;

    // Clean up old watcher
    headWatcher?.dispose();
    watchedGitDir = gitDir;

    // Watch refs/remotes/origin/ — updated on git push / git fetch
    const refsPattern = new vscode.RelativePattern(
        vscode.Uri.file(path.join(gitDir, 'refs', 'remotes', 'origin')),
        '**/*',
    );
    const watcher = vscode.workspace.createFileSystemWatcher(refsPattern);

    const onRefChange = async () => {
        const remoteHash = await execAsync('git log --remotes=origin -1 --format=%H', cwd, 5000);
        if (!remoteHash || remoteHash === lastRemoteHash) return;
        lastRemoteHash = remoteHash;
        log.debug('Push detected via file watcher');
        pendingStats = await fetchStatsForCwd(cwd);
    };

    watcher.onDidChange(onRefChange);
    watcher.onDidCreate(onRefChange);

    headWatcher = watcher;
}

/**
 * Disposes the current file watcher. Call on extension deactivation.
 */
export function disposeGitWatcher(): void {
    headWatcher?.dispose();
    headWatcher = null;
    watchedGitDir = null;
}

/**
 * Returns the "owner/repo" identifier of the git remote for the active file,
 * or null if the file is not inside a git repository with an origin remote.
 *
 * Supports both SSH (git@github.com:owner/repo.git) and HTTPS remotes.
 * Results are cached for 5 minutes per working directory.
 */
export async function detectRepo(): Promise<string | null> {
    const cwd = getActiveCwd();
    if (!cwd) return null;

    // Return cached result if still fresh and same directory
    if (cwd === cachedRepoCwd && Date.now() - repoFetchedAt < REPO_CACHE_TTL) {
        return cachedRepo;
    }

    const url = await execAsync('git remote get-url origin', cwd, 5000);
    if (!url) {
        cachedRepo = null;
        cachedRepoCwd = cwd;
        repoFetchedAt = Date.now();
        return null;
    }

    // SSH: git@github.com:owner/repo.git
    const sshMatch = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
    if (sshMatch) {
        cachedRepo = sshMatch[1];
        cachedRepoCwd = cwd;
        repoFetchedAt = Date.now();
        return cachedRepo;
    }

    // HTTPS: https://github.com/owner/repo.git
    try {
        const parsed = new URL(url);
        const p = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '');
        if (p.includes('/')) {
            cachedRepo = p;
            cachedRepoCwd = cwd;
            repoFetchedAt = Date.now();
            return cachedRepo;
        }
    } catch { /* not a valid URL */ }

    cachedRepo = null;
    cachedRepoCwd = cwd;
    repoFetchedAt = Date.now();
    return null;
}

/** Fetches 24h commit stats from pushed commits only. */
async function fetchStatsForCwd(cwd: string): Promise<{ insertions: number; deletions: number }> {
    const out = await execAsync('git log --remotes=origin --since="24 hours ago" --shortstat --format=""', cwd, 10000);
    if (!out) return { insertions: 0, deletions: 0 };

    let totalIns = 0;
    let totalDel = 0;
    for (const line of out.split('\n')) {
        const ins = line.match(/(\d+) insertion/);
        const del = line.match(/(\d+) deletion/);
        if (ins) totalIns += parseInt(ins[1], 10);
        if (del) totalDel += parseInt(del[1], 10);
    }

    log.debug(`Commit stats (24h): +${totalIns} -${totalDel}`);
    return { insertions: totalIns, deletions: totalDel };
}

/**
 * Returns commit stats if a push was detected (via file watcher on remote refs).
 * Sets up the file watcher on first call.
 */
export async function getCommitStats(): Promise<{ insertions: number; deletions: number } | null> {
    const cwd = getActiveCwd();
    if (!cwd) return null;

    // Ensure file watcher is set up for this repo
    await setupWatcher(cwd);

    // If the watcher already detected a push, return the pending stats
    if (pendingStats) {
        const stats = pendingStats;
        pendingStats = null;
        return stats;
    }

    // First call: initialize remote hash and return initial stats
    if (lastRemoteHash === null) {
        const remoteHash = await execAsync('git log --remotes=origin -1 --format=%H', cwd, 5000);
        if (!remoteHash) return null;
        lastRemoteHash = remoteHash;
        return fetchStatsForCwd(cwd);
    }

    return null;
}
