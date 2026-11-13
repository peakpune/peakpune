import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { cpSync, readdirSync, rmSync, readFileSync, writeFileSync, statSync } from 'node:fs';
// Only replace generated HTML and Astro bundles. Source assets/data are preserved.
for (const name of ['places', 'outdoors', 'events', 'meetups', 'moments', 'powered-by', 'PuneMetroguide', '_astro']) rmSync(`public/${name}`, {recursive: true, force: true});
for (const entry of readdirSync('dist')) cpSync(`dist/${entry}`, `public/${entry}`, {recursive: true});

// Astro's island uid includes its absolute component path, so checkout locations
// otherwise cause harmless output drift. The uid is opaque to hydration. Derive it
// from the stable component URL and serialized props instead, never listing data.
function stabilizeIslands(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) { stabilizeIslands(path); continue; }
    if (!name.endsWith('.html')) continue;
    const html = readFileSync(path, 'utf8').replace(/<astro-island\b[^>]*>/g, tag => {
      const component = tag.match(/component-url="([^"]*)"/)?.[1] ?? '';
      const props = tag.match(/props="([^"]*)"/)?.[1] ?? '';
      const uid = createHash('sha256').update(component + '|' + props).digest('hex').slice(0, 16);
      return tag.replace(/uid="[^"]*"/, `uid="${uid}"`);
    });
    writeFileSync(path, html);
  }
}
stabilizeIslands('public');
