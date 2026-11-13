#!/usr/bin/env node
// Offline, scope and weight checks for /PuneMetroguide/. Needs Playwright with Chromium (not part of `npm test`).
//   node scripts/metro-offline-check.mjs            (after npm run build)
// It serves public/ on a local port with gzip and a 301 from /PuneMetroguide to /PuneMetroguide/,
// then drives Chromium: first load, offline reloads, back/forward, scope isolation, update flow, Slow 3G.
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync, existsSync, statSync, cpSync, writeFileSync, mkdtempSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.error('Playwright is not installed here; cannot run browser checks.'); process.exit(2); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain' };
const COMPRESS = new Set(['.html', '.css', '.js', '.json', '.svg', '.ttf', '.webmanifest', '.xml', '.txt']);
function serve(getDir) {
  const hits = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x'); hits.push(url.pathname + url.search);
    let p = decodeURIComponent(url.pathname);
    const dir = getDir();
    if (p === '/PuneMetroguide') { res.writeHead(301, { Location: '/PuneMetroguide/' + url.search }); return res.end(); }
    let f = join(dir, p);
    if (p.endsWith('/')) f = join(f, 'index.html');
    if (!f.startsWith(dir) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end('<h1>404</h1>'); }
    const ext = extname(f); let body = readFileSync(f); const h = { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'public, max-age=0, must-revalidate' };
    if (COMPRESS.has(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { body = gzipSync(body); h['Content-Encoding'] = 'gzip'; }
    h['Content-Length'] = body.length; res.writeHead(200, h); res.end(body);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, port: server.address().port, hits })));
}

const results = []; let failed = 0;
const check = (name, ok, detail = '') => { results.push([ok ? 'PASS' : 'FAIL', name, detail]); if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
const info = (name, detail) => { results.push(['INFO', name, detail]); console.log(`INFO  ${name}  ${detail}`); };

const PUBLIC = process.env.METRO_DIR || join(root, 'public');
const data = JSON.parse(readFileSync(join(root, 'data/metro/metro.json'), 'utf8'));
let dir = PUBLIC;
const { server, port, hits } = await serve(() => dir);
const base = `http://127.0.0.1:${port}`;
const guide = `${base}/PuneMetroguide/`;
const browser = await chromium.launch();
const newCtx = async () => { const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); return c; };
const swState = (page) => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/PuneMetroguide/'); return r ? { scope: r.scope, active: !!r.active, controller: !!navigator.serviceWorker.controller } : null; });
const cacheInfo = (page) => page.evaluate(async () => { const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).length; return out; });

try {
  // 1. first load installs the worker and fills the cache
  const ctx = await newCtx(); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(guide, { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open((await caches.keys())[0])).keys()).length > 5, null, { timeout: 60000 });
  const st = await swState(page);
  check('service worker registered with scope /PuneMetroguide/', st && st.scope === `${base}/PuneMetroguide/`, st && st.scope);
  const sw = readFileSync(join(PUBLIC, 'PuneMetroguide/sw.js'), 'utf8');
  const precache = JSON.parse(/const PRECACHE = (\[[\s\S]*?\]);/.exec(sw)[1]);
  const ci = await cacheInfo(page);
  check('every precache URL is cached', Object.values(ci)[0] === precache.length, JSON.stringify(ci) + ` of ${precache.length}`);
  check('first load has no console errors', errors.length === 0, errors.join(' | ').slice(0, 200));

  // 2. controlled after reload, then offline
  await page.reload({ waitUntil: 'load' });
  check('page is controlled after a reload', (await swState(page)).controller);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  const h1 = await page.textContent('h1');
  check('offline reload of /PuneMetroguide/ renders', /Pune Metro, simply/.test(h1), h1);
  const label = await page.textContent('.verified time');
  check('offline page shows the dataset verified_on date', await page.getAttribute('.verified time', 'datetime') === data.verified_on, label);
  const font = await page.evaluate(async () => { await document.fonts.ready; return [getComputedStyle(document.querySelector('h1')).fontFamily, document.fonts.check('800 40px Fraunces'), [...document.fonts].map((f) => f.family + ':' + f.status).join(',')]; });
  check('brand fonts and CSS work offline', /Fraunces/.test(font[0]) && font[1], font[2]);
  check('offline notice is shown', await page.isVisible('#metro-net'));
  check('guide content is complete offline (tables, areas, sources)', (await page.locator('.fare tbody tr').count()) > 40 && (await page.locator('.area').count()) === 11 && (await page.locator('#sources a').count()) > 10);
  // planner offline: real journeys, computed locally from the embedded data with the network off
  const plannerThere = await page.evaluate(() => !!document.querySelector('#metro-planner select'));
  check('planner is running offline (selects rendered by the Gleam app)', plannerThere);
  if (plannerThere) {
    const text = async () => (await page.innerText('#metro-planner .res')).replace(/\s+/g, ' ');
    var trip = async (a, b) => { await page.selectOption('#pl-from', a); await page.selectOption('#pl-to', b); await page.waitForTimeout(80); return text(); };
    let t = await trip('ramwadi', 'swargate');
    check('offline: Ramwadi to Swargate is Aqua, change at District Court, Purple, Rs 25', /Line 2 \(Aqua\).*towards Vanaz.*Line 1 \(Purple\).*towards Swargate.*Change at District Court.*Rs 25/.test(t));
    t = await trip('pune-railway-station', 'yerwada');
    check('offline: same-line trip needs no change', /No change needed/.test(t));
    t = await trip('bopodi', 'deccan-gymkhana');
    check('offline: disputed pair shows the official-chart fallback, never a fare', /Check the official fare chart/.test(t) && !/Fare: Rs/.test(t));
    t = await trip('kasarwadi', 'bund-garden');
    check('offline: corrected pair Kasarwadi to Bund Garden is Rs 30', /Fare: Rs 30/.test(t));
    const dis = await page.evaluate(() => ['baner-gaon', 'balewadi-high-street', 'range-hill'].map((v) => { const o = [...document.querySelectorAll('#pl-to option')].find((x) => x.value === v); return o && o.disabled; }));
    check('offline: closed Line 3 stations and Range Hill cannot be selected', dis.every(Boolean), JSON.stringify(dis));
    t = await trip('hinjawadi-phase-ii-circle-ii', 'swargate');
    check('offline: Hinjawadi to Swargate changes at District Court with two separate tickets and the media-report note', /District Court/.test(t) && /Line 3 \(Pink\)/.test(t) && /two separate fare systems/.test(t) && /reported open by the media/.test(t), t.slice(0, 200));
    await page.selectOption('#pl-area', 'kharadi'); await page.waitForTimeout(80);
    check('offline: area helper says Kharadi has no station and offers Ramwadi', /No station in the area/.test(await page.innerText('#metro-planner')) && /Ramwadi/.test(await page.innerText('#metro-planner .area-stations')));
  }

  // phone width: the planner and its results must fit the screen
  await page.setViewportSize({ width: 390, height: 844 });
  await trip('ramwadi', 'swargate'); await page.selectOption('#pl-area', 'hinjawadi'); await page.waitForTimeout(100);
  const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, planner: Math.round(document.querySelector('#metro-planner .pl').getBoundingClientRect().right) }));
  check('no horizontal overflow at 390 px with the planner and a result showing', wide.doc <= wide.win && wide.planner <= wide.win, JSON.stringify(wide));
  await page.setViewportSize({ width: 1280, height: 900 });

  // 4. back / forward offline
  await page.goto(`${guide}#fares`, { waitUntil: 'load' });
  await page.goto(`${guide}?x=1#areas`, { waitUntil: 'load' });
  await page.goBack(); await page.goForward(); await page.reload({ waitUntil: 'load' });
  check('back, forward and reload with query and hash work offline', /Pune Metro, simply/.test(await page.textContent('h1')));

  // 5. the bare URL while offline (outside the worker's scope: it can only work from the browser's HTTP cache)
  const tryBare = async (pg) => { try { await pg.goto(`${base}/PuneMetroguide`, { waitUntil: 'load', timeout: 8000 }); return /Pune Metro, simply/.test(await pg.textContent('h1')) ? 'loads' : 'wrong page'; } catch (e) { return 'fails: ' + String(e.message).split('\n')[0]; } };
  const bare = await tryBare(page);
  check('bare /PuneMetroguide works offline after a visit to /PuneMetroguide/ (redirect kept in HTTP cache)', bare === 'loads', bare);

  // 5b. visitor who arrived through the bare URL first
  const cb = await newCtx(); const pb = await cb.newPage();
  await pb.goto(`${base}/PuneMetroguide`, { waitUntil: 'load' });
  await pb.evaluate(() => navigator.serviceWorker.ready); await pb.waitForTimeout(1500); await pb.reload({ waitUntil: 'load' });
  await cb.setOffline(true);
  const bare2 = await tryBare(pb);
  check('bare /PuneMetroguide works offline for a visitor who arrived through it', bare2 === 'loads', bare2);
  await pb.goto(guide, { waitUntil: 'load' }).catch(() => {});
  check('canonical /PuneMetroguide/ works offline for the same visitor', /Pune Metro, simply/.test(await pb.textContent('h1')));
  await cb.close();

  // 6. isolation: other pages and similarly named paths are not touched
  await page.goto(guide, { waitUntil: 'load' }).catch(() => {});
  const leak = await page.evaluate(async () => { try { const r = await fetch('/data/plans.json'); return 'served ' + r.status; } catch { return 'network error'; } });
  check('worker does not serve other site files from cache (offline fetch of /data/plans.json fails)', leak === 'network error', leak);
  await ctx.setOffline(false);
  const other = await ctx.newPage();
  await other.goto(`${base}/places/`, { waitUntil: 'load' }).catch(() => {});
  check('/places/ is not controlled by the guide worker', (await other.evaluate(() => navigator.serviceWorker.controller)) === null);
  const resp = await other.goto(`${base}/PuneMetroguideOther/`, { waitUntil: 'load' });
  check('/PuneMetroguideOther/ is not controlled and is a normal 404', resp.status() === 404 && (await other.evaluate(() => navigator.serviceWorker.controller)) === null);
  await ctx.setOffline(true);
  const offOther = await other.goto(`${base}/places/`, { waitUntil: 'load', timeout: 8000 }).then(() => 'loaded').catch(() => 'fails');
  check('/places/ is not served from the guide cache when offline', offOther === 'fails', offOther);
  await ctx.setOffline(false);
  const bareOnline = await other.goto(`${base}/PuneMetroguide`, { waitUntil: 'load' });
  check('online: /PuneMetroguide redirects to /PuneMetroguide/', other.url() === guide, other.url() + ' (' + bareOnline.status() + ')');
  const lower = await other.goto(`${base}/punemetroguide/`, { waitUntil: 'load' });
  check('lower-case path is not invented (404)', lower.status() === 404);
  await ctx.close();

  // 7. update flow: a new deploy shows the note and swaps only when tapped
  const tmp = mkdtempSync(join(tmpdir(), 'metro-upd-')); cpSync(PUBLIC, tmp, { recursive: true }); dir = tmp;
  const c2 = await newCtx(); const p2 = await c2.newPage();
  await p2.goto(guide, { waitUntil: 'load' }); await p2.evaluate(() => navigator.serviceWorker.ready);
  await p2.waitForFunction(async () => (await caches.keys()).length === 1 && (await (await caches.open((await caches.keys())[0])).keys()).length > 5);
  await p2.reload({ waitUntil: 'load' });
  const oldKey = Object.keys(await cacheInfo(p2))[0];
  let html = readFileSync(join(tmp, 'PuneMetroguide/index.html'), 'utf8').replace('Pune Metro, simply.', 'Pune Metro, simply. (new version)');
  writeFileSync(join(tmp, 'PuneMetroguide/index.html'), html);
  let swSrc = readFileSync(join(tmp, 'PuneMetroguide/sw.js'), 'utf8').replace(/const CACHE = '[^']+'/, "const CACHE = 'pp-metro-newversion'");
  writeFileSync(join(tmp, 'PuneMetroguide/sw.js'), swSrc);
  await p2.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration('/PuneMetroguide/'); await r.update(); });
  await p2.waitForSelector('#metro-update:not([hidden])', { timeout: 15000 }).then(() => check('update note appears when a new version is deployed', true), () => check('update note appears when a new version is deployed', false));
  const staleStill = /\(new version\)/.test(await p2.textContent('h1'));
  check('new version is not swapped in silently', !staleStill);
  await p2.click('#metro-update button');
  await p2.waitForFunction(() => /\(new version\)/.test(document.querySelector('h1').textContent), null, { timeout: 15000 }).then(() => check('tapping refresh loads the new version', true), () => check('tapping refresh loads the new version', false));
  const keys = Object.keys(await cacheInfo(p2));
  check('old cache is deleted after the update', keys.length === 1 && keys[0] === 'pp-metro-newversion' && !keys.includes(oldKey), keys.join(','));
  await c2.close(); dir = PUBLIC;

  // 8. Slow 3G first load
  const c3 = await newCtx(); const p3 = await c3.newPage(); const cdp = await c3.newCDPSession(p3);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: (500 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 });
  let bytes = 0; cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; });
  const t0 = Date.now(); let dcl = 0, load = 0;
  p3.on('domcontentloaded', () => { dcl = Date.now() - t0; });
  await p3.goto(guide, { waitUntil: 'load', timeout: 180000 }); load = Date.now() - t0;
  const visible = await p3.isVisible('h1');
  await p3.evaluate(() => navigator.serviceWorker.ready);
  const ready = Date.now() - t0;
  info('Slow 3G (500 kbps, 400 ms) first load', `DOMContentLoaded ${(dcl / 1000).toFixed(1)}s, load ${(load / 1000).toFixed(1)}s, worker ready ${(ready / 1000).toFixed(1)}s, ${(bytes / 1024).toFixed(0)} KB transferred`);
  check('Slow 3G first load completes and the guide is visible', visible && load < 120000, `${(load / 1000).toFixed(1)}s`);
  await c3.close();

  // 9. weight of the metro section (gzip, as a CDN would send it)
  const gz = (f) => gzipSync(readFileSync(f), { level: 9 }).length;
  const ownNames = ['index.html', 'sw.js', ...precache.filter((u) => u.startsWith('/PuneMetroguide/') && u !== '/PuneMetroguide/').map((u) => u.split('/').pop())];
  const own = ownNames.map((n) => [n, gz(join(PUBLIC, 'PuneMetroguide', n))]);
  const shared = [['tokens.css', gz(join(PUBLIC, 'tokens.css'))], ['app.js', gz(join(PUBLIC, 'app.js'))], ['fonts/fraunces.ttf', gz(join(PUBLIC, 'fonts/fraunces.ttf'))], ['fonts/inter.ttf', gz(join(PUBLIC, 'fonts/inter.ttf'))]];
  const sum = (a) => a.reduce((n, x) => n + x[1], 0);
  info('metro-only weight (gzip)', `${(sum(own) / 1024).toFixed(0)} KB: ` + own.map(([n, s]) => `${n} ${(s / 1024).toFixed(0)} KB`).join(', '));
  info('shared site files the guide reuses (gzip)', `${(sum(shared) / 1024).toFixed(0)} KB: ` + shared.map(([n, s]) => `${n} ${(s / 1024).toFixed(0)} KB`).join(', '));
  check('metro-only first-load weight is under 500 KB (gzip)', sum(own) < 500 * 1024, `${(sum(own) / 1024).toFixed(0)} KB`);
  info('whole first load including the shared fonts (gzip)', `${((sum(own) + sum(shared)) / 1024).toFixed(0)} KB, ${sum(own) + sum(shared) < 500 * 1024 ? 'within' : 'over'} the ~500 KB target; the two shared fonts are most of it`);
} finally {
  await browser.close(); server.close();
}
console.log(`\n${results.filter((r) => r[0] === 'PASS').length} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
