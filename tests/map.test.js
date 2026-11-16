import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, mapPins, MAP_PATH, SITE_URL } from '../scripts/build.mjs';
import { publishRows } from '../scripts/build.mjs';

const rows = publishRows(JSON.parse(readFileSync(new URL('../data/batch-1-places/places.json', import.meta.url), 'utf8'))).filter((r) => r.scope === 'CORE');

test('map pins come only from published rows with numeric coordinates in Pune', () => {
  const pins = mapPins(rows);
  assert.ok(pins.length > 0);
  assert.ok(pins.length < rows.length, 'some places are honestly unpinned');
  for (const p of pins) {
    assert.equal(typeof p.lat, 'number', p.slug);
    assert.equal(typeof p.lon, 'number', p.slug);
    assert.ok(p.lat > 18.2 && p.lat < 18.9 && p.lon > 73.3 && p.lon < 74.4, `pin outside Pune: ${p.slug}`);
    assert.match(p.href, /^\/places\/[a-z0-9-]+\/$/);
    assert.ok(!/</.test(p.name) && !/</.test(p.summary), 'pin text is data, not markup');
  }
});

test('map page renders with data, fallback and one canonical url', () => {
  const d = mkdtempSync(join(tmpdir(), 'pp-map-'));
  const urls = build({ outDir: d });
  assert.ok(urls.some(([p]) => p === MAP_PATH), 'map is in the sitemap');
  const html = readFileSync(join(d, 'map', 'index.html'), 'utf8');
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}/map/">`));
  assert.ok(html.includes('/map/maplibre-gl.js'), 'map library is loaded on the page');
  const data = html.match(/<script type="application\/json" id="map-data">(.*?)<\/script>/s);
  assert.ok(data, 'embedded pin data');
  const pins = JSON.parse(data[1]);
  assert.equal(pins.length, mapPins(rows).length);
  assert.ok(!data[1].includes('</'), 'pin data cannot close its script tag');
  assert.ok(html.includes('id="map-fallback"'), 'no-JS fallback present');
  for (const r of rows) assert.ok(html.includes(`/places/${r.id.replace(/^place-/, '')}/`), `list links ${r.name}`);
});

test('map assets exist and the style uses OpenFreeMap with attribution', () => {
  const dir = new URL('../public/map/', import.meta.url);
  for (const f of ['maplibre-gl.js', 'maplibre-gl.css', 'style.json', 'map.js', 'README.md']) assert.ok(existsSync(join(dir.pathname, f)), f);
  const style = JSON.parse(readFileSync(join(dir.pathname, 'style.json'), 'utf8'));
  assert.equal(style.version, 8);
  assert.equal(style.sources.openmaptiles.type, 'vector');
  assert.ok(style.sources.openmaptiles.url.startsWith('https://tiles.openfreemap.org/'));
  assert.match(style.sources.openmaptiles.attribution, /OpenStreetMap/);
  assert.ok(style.glyphs.includes('tiles.openfreemap.org'));
});
