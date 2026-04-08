import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

mkdirSync(resolve(root, 'out', 'web'), { recursive: true });

try {
    await build({
        entryPoints: [resolve(root, 'src', 'extension-web.ts')],
        outfile: resolve(root, 'out', 'web', 'extension-web.js'),
        bundle: true,
        platform: 'browser',
        format: 'cjs',
        target: 'es2020',
        external: ['vscode'],
        sourcemap: true,
        logLevel: 'info',
    });
} catch {
    process.exit(1);
}
