// npm run metro:check  -> exits 1 if the metro datasets are not self-consistent.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMetro, validateMetro, validateAreas } from './metro-model.mjs';
const data = loadMetro();
const areas = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'data/metro/areas.json'), 'utf8'));
const errs = [...validateMetro(data), ...validateAreas(areas, data)];
if (errs.length) { console.error(`${errs.length} metro data problem(s):`); for (const e of errs) console.error(' - ' + e); process.exit(1); }
console.log(`metro data OK (verified_on ${data.verified_on})`);
