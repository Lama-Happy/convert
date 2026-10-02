// Copies ffmpeg.wasm into ./vendor so the worker is same-origin (required on GitHub Pages).
import { cpSync, mkdirSync, rmSync } from 'node:fs';
rmSync('vendor', { recursive: true, force: true });
mkdirSync('vendor/core', { recursive: true });
cpSync('node_modules/@ffmpeg/ffmpeg/dist/esm', 'vendor/ffmpeg', { recursive: true });
for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) cpSync('node_modules/@ffmpeg/core/dist/esm/' + f, 'vendor/core/' + f);
