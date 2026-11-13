import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile navigation wraps instead of hiding links in a scroll strip', () => {
  const css = readFileSync(new URL('../public/tokens.css', import.meta.url), 'utf8');
  const mobile = css.split('@media(max-width:860px){')[1].split('@media(prefers-reduced-motion')[0];
  assert.match(mobile, /\.site-header nav\{flex-wrap:wrap;padding-bottom:var\(--s2\)\}/);
  assert.doesNotMatch(mobile, /overflow-x:auto|scrollbar-width:none|::-webkit-scrollbar/);
  assert.match(mobile, /html\{scroll-padding-top:168px\}/);
  assert.match(css, /\.site-header nav a\{[^}]*min-height:44px/);
});
