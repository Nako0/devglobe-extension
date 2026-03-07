import * as path from 'path';
import { exec } from 'child_process';
import * as vscode from 'vscode';
import { log } from './logger';

/** Cache TTL for git operations (5 minutes). */
const GIT_CACHE_TTL = 5 * 60 * 1000;

/** Cached repo detection. */
let cachedRepo: string | null = null;
let cachedRepoCwd: string | null = null;
let repoFetchedAt = 0;

/** Last known HEAD hash — used to detect new commits. */
let lastHeadHash: string | null = null;
let headCheckedAt = 0;

/** Cached commit stats. */
let cachedCommitStats: { insertions: number; deletions: number } | null = null;

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
 * Using the file's own directory (rather than the workspace root) handles
 * mono-repos and parent-folder workspaces correctly.
 */
function getActiveCwd(): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;
    return path.dirname(editor.document.uri.fsPath);
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
    if (cwd === cachedRepoCwd && Date.now() - repoFetchedAt < GIT_CACHE_TTL) {
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

/**
 * Returns the total insertions/deletions from all commits in the last 24 hours,
 * but only when a new commit is detected (HEAD hash changed).
 * Returns null if HEAD has not changed since the last call.
 * Results are cached for 5 minutes.
 */
export async function getCommitStats(): Promise<{ insertions: number; deletions: number } | null> {
    const cwd = getActiveCwd();
    if (!cwd) return null;

    // Skip HEAD check if we checked recently
    if (Date.now() - headCheckedAt < GIT_CACHE_TTL) return null;

    const head = await execAsync('git rev-parse HEAD', cwd, 5000);
    if (!head) return null;

    headCheckedAt = Date.now();

    if (head === lastHeadHash) return null; // no new commit
    lastHeadHash = head;

    const out = await execAsync('git log --since="24 hours ago" --shortstat --format=""', cwd, 10000);
    if (!out) {
        cachedCommitStats = { insertions: 0, deletions: 0 };
        return cachedCommitStats;
    }

    let totalIns = 0;
    let totalDel = 0;
    for (const line of out.split('\n')) {
        const ins = line.match(/(\d+) insertion/);
        const del = line.match(/(\d+) deletion/);
        if (ins) totalIns += parseInt(ins[1], 10);
        if (del) totalDel += parseInt(del[1], 10);
    }

    log.debug(`Commit stats (24h): +${totalIns} -${totalDel}`);
    cachedCommitStats = { insertions: totalIns, deletions: totalDel };
    return cachedCommitStats;
}
