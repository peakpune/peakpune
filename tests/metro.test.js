import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadMetro, validateMetro, validateAreas, buildModel, slug } from '../scripts/metro-model.mjs';
import { renderGuideMain, longDate, GUIDE_PATH, PLANNER_BUNDLE } from '../scripts/metro-guide.mjs';
import { generate } from '../scripts/metro-gleam-data.mjs';
import { build, esc } from '../scripts/build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = loadMetro();
const areas = JSON.parse(readFileSync(join(root, 'data/metro/areas.json'), 'utf8'));
const model = buildModel(data);
const out = mkdtempSync(join(tmpdir(), 'pp-metro-'));
build({ outDir: out });
const guideHtml = readFileSync(join(out, 'PuneMetroguide/index.html'), 'utf8');
const sw = readFileSync(join(out, 'PuneMetroguide/sw.js'), 'utf8');

test('metro datasets are self-consistent', () => {
  assert.deepEqual(validateMetro(data), []);
  assert.deepEqual(validateAreas(areas, data), []);
});
test('validator catches the mistakes it exists for', () => {
  const bad = structuredClone(data);
  bad.fares.maha_metro.matrix[3][25] = 25; // an unlisted asymmetric pair
  assert.ok(validateMetro(bad).some((e) => /asymmetric/.test(e)));
  const unknown = structuredClone(data);
  unknown.lines[1].station_codes['Ghost Station'] = 'XXX';
  assert.ok(validateMetro(unknown).some((e) => /unknown station/.test(e)));
  const media = structuredClone(data);
  media.lines[2].station_status.verified = true; // media statuses can never be marked operator-verified
  assert.ok(validateMetro(media).length > 0);
  const ext = structuredClone(data);
  ext.lines[0].station_order.push('Nigdi'); // approved-but-unbuilt stations must never be routable
  assert.ok(validateMetro(ext).length > 0);
});
test('model keeps District Court as one station and Shivaji Nagar as two', () => {
  const dc = model.stations.find((s) => s.id === 'district-court');
  assert.deepEqual([...dc.lines].sort(), ['aqua', 'pink_line3', 'purple']);
  assert.equal(model.stations.filter((s) => s.id.startsWith('shivaji-nagar')).length, 2);
  assert.equal(slug('R.T.O., Pune'), 'rto-pune');
});
test('Range Hill is listed but not open; every Line 3 status is media and unverified', () => {
  assert.equal(model.membership['purple:range-hill'].state, 'not_open');
  for (const id of model.lines.find((l) => l.id === 'pink_line3').order) {
    const m = model.membership[`pink_line3:${id}`];
    assert.equal(m.statusSource, 'media'); assert.equal(m.verified, false);
  }
});
test('the fare correction and the remaining disputed pairs are recorded', () => {
  assert.equal(data.fares.maha_metro.corrections[0].now, 30);
  assert.equal(model.disputed.length, 11);
  assert.ok(!model.disputed.some((p) => [p.a, p.b].includes('kasarwadi') && [p.a, p.b].includes('bund-garden')));
});

test('guide is at /PuneMetroguide/ with its own folder, canonical and no lower-case twin', () => {
  assert.ok(existsSync(join(out, 'PuneMetroguide/index.html')));
  assert.ok(!existsSync(join(out, 'punemetroguide')));
  assert.ok(guideHtml.includes('<link rel="canonical" href="https://peakpune.com/PuneMetroguide/">'));
  assert.equal(GUIDE_PATH, '/PuneMetroguide/');
});
test('the verified date is rendered from the data, never typed into markup', () => {
  assert.ok(guideHtml.includes(`<time datetime="${data.verified_on}">${longDate(data.verified_on)}</time>`));
  const moved = renderGuideMain({ data: { ...data, verified_on: '2030-01-02' }, model: buildModel({ ...data, verified_on: '2030-01-02' }), areas, esc });
  assert.ok(moved.includes('2 January 2030') && !moved.includes(longDate(data.verified_on) + '</time>'));
  for (const file of [...readdirSync(join(root, 'site/metro')).map((f) => join('site/metro', f)), 'src/client/metro-guide.ts']) {
    const f = file; const src = readFileSync(join(root, file), 'utf8');
    assert.ok(!/\b20\d\d-\d\d-\d\d\b|(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d/.test(src), `${f} hardcodes a date`);
  }
});
test('disputed pairs show "check the chart" in both directions and never a printed number', () => {
  assert.equal((guideHtml.match(/<td class="chk"/g) || []).length, 2 * model.disputed.length);
});
test('guide content works without JavaScript: sections, tables, areas, sources, planner fallback', () => {
  for (const id of ['planner', 'network', 'tickets', 'fares', 'timings', 'interchange', 'practical', 'areas', 'sources']) assert.ok(guideHtml.includes(`id="${id}"`), id);
  assert.ok(guideHtml.includes('id="metro-planner-fallback"') && guideHtml.includes('Use the official fare chart'));
  assert.equal((guideHtml.match(/<article class="area"/g) || []).length, areas.areas.length);
  assert.ok(guideHtml.includes('https://wa.me/9420101990'));
  assert.ok(guideHtml.includes('punemetrorail.org') && guideHtml.includes('punerimetro.in'));
  assert.ok(/Range Hill/.test(guideHtml) && /Listed, not open/.test(guideHtml));
});
test('external links are labelled as needing the internet', () => {
  const links = [...guideHtml.matchAll(/<a class="ext" href="https?:[^"]+"[^>]*>(.*?)<\/a>/g)];
  assert.ok(links.length > 20);
  assert.ok(links.every((m) => m[1].includes('needs internet')));
});
test('Line 3 WhatsApp: only the official shared number, always labelled reported', () => {
  assert.equal(data.operators.pitcmrl.whatsapp_eticket, null); // no Line 3-specific number is published
  const wa = data.ticketing.line3.whatsapp_shared_number;
  assert.equal(wa.url, 'https://wa.me/9420101990'); // the official Pune Metro number, never an invented one
  assert.equal(wa.status_source, 'media');
  assert.equal(wa.verified, false);
  assert.ok(guideHtml.includes('wa.me/9420101990'));
  assert.ok(/labelled reported/.test(guideHtml));
});

test('service worker: guide-only scope, precache exists, no silent skipWaiting, passes other requests through', () => {
  const precache = JSON.parse(/const PRECACHE = (\[[\s\S]*?\]);/.exec(sw)[1]);
  assert.equal(precache[0], '/PuneMetroguide/');
  for (const u of precache) {
    const path = u.split('?')[0];
    const file = path.startsWith('/PuneMetroguide/') ? join(out, path.slice(1)) : join(root, 'public', path.slice(1));
    assert.ok(existsSync(file) || existsSync(join(out, path.slice(1))), `${u} is not in the build`);
  }
  assert.ok(precache.some((u) => u.includes('/fonts/inter.ttf')) && precache.some((u) => u.includes('/fonts/fraunces.ttf')) && precache.some((u) => u.startsWith('/tokens.css?v=')));
  assert.equal((sw.match(/self\.skipWaiting\(\)/g) || []).length, 1);
  assert.ok(/addEventListener\('message'[^\n]*self\.skipWaiting\(\)/.test(sw));
  assert.ok(/if \(!isGuidePage && !listed\.has\(key\)\) return;/.test(sw));
  assert.ok(/const CACHE = 'pp-metro-[0-9a-f]{10}'/.test(sw));
  const guideJs = readFileSync(join(out, 'PuneMetroguide', readdirSync(join(out, 'PuneMetroguide')).find((f) => /^guide\..+\.js$/.test(f))), 'utf8');
  assert.ok(guideJs.includes("register('./sw.js', { scope: './' })"));
});
test('only the guide registers a service worker', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
  for (const f of walk(out).filter((x) => x.endsWith('.html') && !x.includes('/PuneMetroguide/'))) assert.ok(!readFileSync(f, 'utf8').includes('serviceWorker'), f);
  assert.ok(!readFileSync(join(root, 'public/app.js'), 'utf8').includes('serviceWorker'));
});
test('the guide is in the sitemap and keeps the site noindex setting', () => {
  assert.ok(readFileSync(join(out, 'sitemap.xml'), 'utf8').includes('<loc>https://peakpune.com/PuneMetroguide/</loc>'));
  const home = readFileSync(join(out, 'index.html'), 'utf8');
  const robots = (h) => /name="robots" content="([^"]+)"/.exec(h)[1];
  assert.equal(robots(guideHtml), robots(home));
});

test('generated Gleam data matches the datasets', () => {
  const files = generate();
  for (const [f, text] of Object.entries(files)) assert.equal(readFileSync(join(root, 'metro/src/peakpune_metro', f), 'utf8'), text, `${f} is stale: run npm run metro:data`);
  assert.ok(files['data.gleam'].includes(`verified_on: "${data.verified_on}"`));
  assert.ok(!/Nigdi|Katraj|Wagholi/.test(files['ids.gleam']));
});
test('the Gleam planner bundle is built, committed and referenced by the guide', () => {
  assert.ok(existsSync(join(root, PLANNER_BUNDLE)), `${PLANNER_BUNDLE} is missing: run npm run metro:build`);
  assert.ok(/planner\.[0-9a-f]{10}\.js/.test(guideHtml));
});
