import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
for (const p of ['index.html', 'css', 'js', 'vendor']) cpSync(p, 'dist/' + p, { recursive: true });
writeFileSync('dist/.nojekyll', '');
