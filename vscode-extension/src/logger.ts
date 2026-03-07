/**
 * Lightweight logger with four levels.
 *
 * - debug  Only printed in development mode (verbose: heartbeat payloads, geo, git…)
 * - info   Always printed — notable events (connected, city change, commit detected…)
 * - warn   Always printed — recoverable issues
 * - error  Always printed — unexpected failures
 *
 * Call `initLogger(true)` when running as a development extension host.
 */

let devMode = false;

export function initLogger(isDev: boolean): void {
    devMode = isDev;
}

export const log = {
    debug: (...args: unknown[]) => {
        if (devMode) console.log('[DevGlobe]', ...args);
    },
    info:  (...args: unknown[]) => console.log('[DevGlobe]', ...args),
    warn:  (...args: unknown[]) => console.warn('[DevGlobe]', ...args),
    error: (...args: unknown[]) => console.error('[DevGlobe]', ...args),
};
