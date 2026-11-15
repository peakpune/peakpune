import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { isExternal, newTabAnchor, openExternalLinksInNewTab } from '../scripts/links.mjs';

test('off-site http(s) links are external; own site, relative and odd schemes are not', () => {
  assert.equal(isExternal('https://punerunners.com/'), true);
  assert.equal(isExternal('https://www.openstreetmap.org/?a=1&amp;b=2'), true);
  assert.equal(isExternal('https://peakpune.com/places/'), false);
  assert.equal(isExternal('https://www.peakpune.com/'), false);
  assert.equal(isExternal('/places/'), false);
  assert.equal(isExternal('mailto:someone@example.org'), false);
  assert.equal(isExternal('javascript:alert(1)'), false);
  assert.equal(isExternal('https://evil-peakpune.com.example.org/'), true, 'a look-alike host is still off-site');
});

test('an off-site anchor opens in a new tab with noopener noreferrer and keeps its other attributes', () => {
  assert.equal(
    openExternalLinksInNewTab('<a class="chip" href="https://gdg.community.dev/gdg-pune/">Join</a>'),
    '<a class="chip" href="https://gdg.community.dev/gdg-pune/" rel="noopener noreferrer" target="_blank">Join</a>',
  );
});

test('existing rel values are kept, and an explicit author target is not overridden', () => {
  assert.match(newTabAnchor('<a href="https://pune.gov.in/" rel="nofollow noopener">x</a>'), /rel="nofollow noopener noreferrer"/);
  assert.equal(newTabAnchor('<a href="https://wa.me/1" target="_self">x</a>'), '<a href="https://wa.me/1" target="_self">x</a>');
});

test('own-site and relative links are unchanged', () => {
  const html = '<a href="/places/">a</a><a href="https://peakpune.com/x">b</a>';
  assert.equal(openExternalLinksInNewTab(html), html);
});

test('every external link in the built site opens in a new tab', () => {
  const files = [];
  const walk = (dir) => { for (const name of readdirSync(dir)) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p); else if (name.endsWith('.html')) files.push(p); } };
  walk('public');
  assert.ok(files.length > 50, 'the built site is present');
  const offenders = [];
  for (const file of files) {
    for (const [tag] of readFileSync(file, 'utf8').matchAll(/<a\b[^>]*>/gi)) {
      const href = tag.match(/\shref="([^"]*)"/);
      if (href && isExternal(href[1]) && !(/\starget="_blank"/.test(tag) && /\brel="[^"]*noopener/.test(tag))) offenders.push(`${file}: ${tag.slice(0, 120)}`);
    }
  }
  assert.deepEqual(offenders, []);
});
