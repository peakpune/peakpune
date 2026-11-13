import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {build,esc,jsonLd,safeUrl,placeTitle,placeLd,SITE_URL} from '../scripts/build.mjs';
const r={id:'place-x',name:'X <b>',type:'museum',neighbourhood:'Kothrud',address:'UNKNOWN',hours:'10 to 5',price_note:null,summary:'s',lat:18.5,lon:73.8,url_official:'javascript:alert(1)'};
test('escapes HTML and script-closing JSON-LD',()=>{assert.equal(esc('<a href="x">&'),'&lt;a href=&quot;x&quot;&gt;&amp;');assert.ok(!jsonLd({a:'</script><script>'}).slice(35,-9).includes('</script>'));});
test('only http(s) links survive',()=>{assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('https://example.org/'),'https://example.org/');});
test('title names only the fields the row has',()=>{assert.equal(placeTitle(r),'X <b>, Kothrud, Pune: timings | Peak Pune');});
test('structured data omits unknown address and unsafe url',()=>{const ld=placeLd(r);assert.equal(ld['@type'],'Museum');assert.ok(!('streetAddress' in ld.address));assert.ok(!('sameAs' in ld));assert.equal(ld.geo.latitude,18.5);});
test('build writes one canonical page per sitemap url',()=>{const d=mkdtempSync(join(tmpdir(),'pp-'));const urls=build({outDir:d});assert.ok(urls.length>30);
  for(const [p] of urls){const f=join(d,p,'index.html');assert.ok(existsSync(f),p);const h=readFileSync(f,'utf8');assert.ok(h.includes(`<link rel="canonical" href="${SITE_URL}${p}">`),p);assert.equal((h.match(/<h1/g)||[]).length,1,p);JSON.parse(h.match(/ld\+json">(.*?)<\/script>/s)[1]);}
  const sm=readFileSync(join(d,'sitemap.xml'),'utf8');assert.equal((sm.match(/<loc>/g)||[]).length,urls.length);assert.ok(!sm.includes('404'));});
