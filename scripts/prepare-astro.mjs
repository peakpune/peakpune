import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { build } from './build.mjs';
const assets = '.generated/assets';
rmSync('.generated', {recursive: true, force: true});
mkdirSync(assets, {recursive: true});
// Use the reviewed renderer for sitemap, robots, icons and manifest. Astro owns HTML.
build({outDir: assets});
for (const entry of readdirSync(assets, {withFileTypes: true})) {
  // The Pune Metro guide's hashed assets and worker ride through publicDir; Astro generates its HTML.
  if (entry.name === 'PuneMetroguide') { rmSync(join(assets, entry.name, 'index.html'), {force: true}); continue; }
  if (entry.isDirectory() || entry.name.endsWith('.html')) rmSync(join(assets, entry.name), {recursive: true, force: true});
}
for (const file of ['app.js', 'tokens.css', 'og.png', 'fonts', 'data']) {
  cpSync(join('public', file), join(assets, file), {recursive: true});
}
