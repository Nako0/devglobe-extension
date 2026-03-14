'use strict';

const fs = require('fs');
const path = require('path');
const { getLanguageFromExt } = require('./languages');

const ACTIVITY_TIMEOUT = 60_000; // 1 minute

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'target', '__pycache__', '.next',
  'dist', 'build', '.cache', '.venv', 'venv',
]);

const IGNORE_EXTS = new Set([
  '.exe', '.dll', '.so', '.dylib', '.o', '.a',
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.br',
  '.lock', '.map',
]);

let _lastActivityTime = 0;
let _lastExt = null;
let _watcher = null;

function shouldIgnore(filePath) {
  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  return IGNORE_EXTS.has(ext);
}

function startWatching(dir) {
  if (_watcher) return;
  try {
    _watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
      if (!filename || shouldIgnore(filename)) return;
      _lastActivityTime = Date.now();
      const ext = path.extname(filename);
      if (ext) _lastExt = ext;
    });
    _watcher.on('error', () => {
      _watcher = null;
    });
  } catch {
    // fs.watch not supported or permission denied
  }
}

function stopWatching() {
  if (_watcher) {
    _watcher.close();
    _watcher = null;
  }
}

function isActive() {
  return (Date.now() - _lastActivityTime) < ACTIVITY_TIMEOUT;
}

function getLanguage() {
  return getLanguageFromExt(_lastExt);
}

module.exports = { startWatching, stopWatching, isActive, getLanguage };
