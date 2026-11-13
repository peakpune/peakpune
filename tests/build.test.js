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
import {outdoorTitle,withBase,BASE} from '../scripts/build.mjs';
test('outdoor titles carry distance and difficulty only when sourced',()=>{assert.equal(outdoorTitle({type:'trek',name:'Torna Fort',distance_from_pune_km:65,travel_time_text:'2 hours by road',difficulty:'Challenging'}),'Torna Fort trek near Pune: 65 km from Pune, 2 hours by road, Challenging | Peak Pune');assert.equal(outdoorTitle({type:'run-route',name:'Kharadi loop',distance_km:5.73}),'Kharadi loop: 5.73 km running route in Pune | Peak Pune');});
test('root links are left alone on a root domain',()=>{assert.equal(BASE,'');assert.equal(withBase('<a href="/x/">'),'<a href="/x/">');});
import {eventLd,monthsIn,areasOf} from '../scripts/build.mjs';
test('event markup only for verified, dated events',()=>{const e={name:'E',summary:'s',status:'verified',start_date:'2026-11-15',url_deep:'https://example.org/e',neighbourhood:'Dapodi',address:'UNKNOWN',organiser:'UNKNOWN'};assert.equal(eventLd(e).startDate,'2026-11-15');assert.equal(eventLd({...e,status:'partial'}),null);assert.equal(eventLd({...e,start_date:null}),null);});
test('month ranges wrap the year and reject unclear text',()=>{assert.deepEqual(monthsIn('November to February'),['November','December','January','February']);assert.deepEqual(monthsIn('Late'),[]);});
test('area hubs need at least two places',()=>{const a=areasOf([{neighbourhood:'Baner'},{neighbourhood:'Baner'},{neighbourhood:'Kothrud'},{neighbourhood:'UNKNOWN'}]);assert.deepEqual(a.map(([n])=>n),['Baner']);});
