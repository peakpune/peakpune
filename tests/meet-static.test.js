import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../scripts/build.mjs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
test('meet is static pay-and-confirm with no RSVP collection routes', () => {
  const out=mkdtempSync(join(tmpdir(),'pp-meet-static-')); build({outDir:out});
  const html=readFileSync(join(out,'meet/index.html'),'utf8');
  for(const s of ['Shivajinagar park','5:30 PM','10 people max','aakash.kamdi@superyes','/meet-payment.png','The exact spot will be confirmed with you in the group or individually over WhatsApp.','wa.me/919404828072','twitter:image','og:image']) assert.ok(html.includes(s),s);
  for(const s of ['mt-form','mt-spots','Place TBC','12 spots','Meet Nº 1 · Admin']) assert.ok(!html.includes(s),s);
  assert.throws(() => read('../functions/api/meet-rsvp.js'));
});
test('meet Event JSON-LD has a place and time but no invented date',()=>{
  const out=mkdtempSync(join(tmpdir(),'pp-meet-schema-')); build({outDir:out});
  const html=readFileSync(join(out,'meet/index.html'),'utf8');
  const graph=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));
  const event=graph.flatMap(g=>g['@graph']||[]).find(x=>x['@type']==='Event');
  assert.equal(event.location.name,'Shivajinagar park'); assert.equal(event.startTime,'17:30'); assert.ok(!('startDate' in event));
});
