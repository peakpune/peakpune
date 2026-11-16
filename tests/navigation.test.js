import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../public/tokens.css', import.meta.url), 'utf8');
const read = (p) => readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf8');

test('navigation never hides links in a scroll strip and keeps 44px targets', () => {
  assert.doesNotMatch(css, /\.site-header nav\{[^}]*overflow-x:auto/);
  assert.doesNotMatch(css, /scrollbar-width:none/);
  assert.match(css, /\.site-header \.nav-d nav>a\{[^}]*min-height:44px/);
  assert.match(css, /\.site-header \.nav-m a\{[^}]*min-height:44px/);
});

test('every page has the grouped desktop menu, the mobile Menu with Map first, and Join', () => {
  for (const p of ['index.html', 'events/index.html', 'map/index.html', 'PuneMetroguide/index.html', 'about/index.html']) {
    const h = read(p);
    assert.match(h, /<nav aria-label="Main navigation"><a href="\/events\/"[^>]*>Events<\/a><a class="map" href="\/map\/"/, p);
    for (const g of ['Explore', 'Outdoors and travel', 'Community']) assert.ok(h.includes(`<summary>${g}</summary>`), `${p} ${g}`);
    assert.match(h, /<details class="menu"><summary>Menu<\/summary><nav class="nav-m" aria-label="Menu"><a class="map" href="\/map\/"[^>]*>Map of Pune<\/a>/, p);
    assert.ok(h.includes('<details class="join">'), p);
  }
});

test('the grouped menus link every section once per menu', () => {
  const h = read('index.html');
  const desktop = h.match(/<nav aria-label="Main navigation">(.*?)<\/nav>/s)[1];
  const mobile = h.match(/<nav class="nav-m"[^>]*>(.*?)<\/nav>/s)[1];
  for (const href of ['/events/', '/map/', '/places/', '/interests/', '/markets/', '/history/', '/outdoors/', '/PuneMetroguide/', '/meetups/', '/about/']) {
    assert.ok(desktop.includes(`href="${href}"`), `desktop ${href}`);
    assert.ok(mobile.includes(`href="${href}"`), `mobile ${href}`);
  }
});
