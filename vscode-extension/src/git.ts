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

/**
 * Promisified exec with timeout. Resolves to trimmed stdout or null on error.
 */
function execAsync(cmd: string, cwd: string, timeout: number): Promise<string | null> {
    return new Promise((resolve) => {
        exec(cmd, { cwd, encoding: 'utf8', timeout }, (err, stdout) => {
            if (err) {
                log.debug('exec failed:', cmd, (err as Error).message);
                resolve(null);
                return;
            }
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
    } catch {
        log.debug('Git remote URL is not a valid URL:', url);
    }

    cachedRepo = null;
    cachedRepoCwd = cwd;
    repoFetchedAt = Date.now();
    return null;
}
