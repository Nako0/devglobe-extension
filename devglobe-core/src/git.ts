import { exec } from 'child_process';
import { GIT_CACHE_TTL } from './constants.js';

let cachedRepo: string | null = null;
let cachedRepoCwd: string | null = null;
let repoFetchedAt = 0;

function execAsync(cmd: string, cwd: string, timeout: number): Promise<string | null> {
  return new Promise((resolve) => {
    exec(cmd, { cwd, encoding: 'utf8', timeout }, (err, stdout) => {
      if (err) { resolve(null); return; }
      resolve((stdout ?? '').trim());
    });
  });
}

function parseRepoUrl(url: string): string | null {
  const sshMatch = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];

  try {
    const parsed = new URL(url);
    const p = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '');
    if (p.includes('/')) return p;
  } catch { /* not a valid URL */ }

  return null;
}

export async function detectRepo(cwd: string): Promise<string | null> {
  if (cwd === cachedRepoCwd && Date.now() - repoFetchedAt < GIT_CACHE_TTL) {
    return cachedRepo;
  }

  const url = await execAsync('git remote get-url origin', cwd, 5000);
  cachedRepoCwd = cwd;
  repoFetchedAt = Date.now();

  if (!url) {
    cachedRepo = null;
    return null;
  }

  cachedRepo = parseRepoUrl(url);
  return cachedRepo;
}
