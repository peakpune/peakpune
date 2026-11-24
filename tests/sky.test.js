import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {build,SITE_URL} from '../scripts/build.mjs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('/sky/ is indexed, in the sitemap, and linked from the site navigation',()=>{
  const d=mkdtempSync(join(tmpdir(),'pp-sky-'));const urls=build({outDir:d});
  assert.ok(urls.some(([p])=>p==='/sky/'));
  const h=readFileSync(join(d,'sky/index.html'),'utf8');
  assert.ok(h.includes('<meta name="robots" content="index'));
  assert.ok(h.includes(`<link rel="canonical" href="${SITE_URL}/sky/">`));
  assert.match(h,/<title>[^<]*Pune sky calendar[^<]*<\/title>/);
  assert.ok(readFileSync(join(d,'sitemap.xml'),'utf8').includes(`${SITE_URL}/sky/`));
  assert.ok(readFileSync(join(d,'index.html'),'utf8').includes('href="/sky/"'));
});
test('sky data: every meteor night outside the IMO-checked years is labelled as unchecked',()=>{
  const ev=JSON.parse(read('data/sky/events.json'));const m=JSON.parse(read('data/sky/meteor-nights.json'));
  const html=read('site/pages/sky.html');
  assert.ok(Array.isArray(m.checked_years)&&m.checked_years.length>0&&m.source.startsWith('https://www.imo.net/'));
  const unchecked=ev.meteors.filter((x)=>!m.checked_years.includes(x.year));
  assert.equal((html.match(/Night not yet checked against the IMO calendar/g)||[]).length,unchecked.length);
});
test('sky page: rows carry dates so the rolling 3-month window can hide the rest',()=>{
  const html=read('site/pages/sky.html');
  assert.ok(html.includes('data-d="'));assert.ok(!html.includes('noindex'));
  assert.ok(html.includes('Solar eclipses: protect your eyes'));
});
