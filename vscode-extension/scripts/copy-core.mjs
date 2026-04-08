import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const source = resolve(root, '..', 'devglobe-core', 'dist', 'devglobe-core.js');
const targetDir = resolve(root, 'out');
const target = resolve(targetDir, 'devglobe-core.mjs');

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
