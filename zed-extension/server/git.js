'use strict';

const { execFile } = require('child_process');

const GIT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _cache = null;
let _cacheTime = 0;
let _cachedCwd = null;

function execFileAsync(cmd, args, opts) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 5000, ...opts }, (err, stdout) => {
      if (err) resolve(null);
      else resolve(stdout.trim());
    });
  });
}

function parseRepoName(url) {
  if (!url) return null;
  // https://github.com/owner/repo.git or git@github.com:owner/repo.git
  const match = url.match(/[/:]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}

async function getRepoName(cwd) {
  const now = Date.now();
  if (_cache && _cachedCwd === cwd && (now - _cacheTime) < GIT_CACHE_TTL) {
    return _cache;
  }

  const url = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd });
  const repo = parseRepoName(url);
  _cache = repo;
  _cacheTime = now;
  _cachedCwd = cwd;
  return repo;
}

module.exports = { getRepoName, parseRepoName };
