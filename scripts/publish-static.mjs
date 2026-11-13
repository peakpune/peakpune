import { cpSync, readdirSync, rmSync } from 'node:fs';
// Only replace generated HTML and Astro bundles. Source assets/data are preserved.
for (const name of ['places', 'outdoors', 'events', 'meetups', 'moments', 'powered-by', '_astro']) rmSync(`public/${name}`, {recursive: true, force: true});
for (const entry of readdirSync('dist')) cpSync(`dist/${entry}`, `public/${entry}`, {recursive: true});
