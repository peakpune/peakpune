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
  for(const s of ['Board game cafe, Shivajinagar','3:30 PM sharp','10 spots · 10 open','aakash.kamdi@superyes','/meet-payment.svg','Location shared after payment.','wa.me/919404828072','upi://pay?pa=aakash.kamdi%40superyes&amp;pn=Aakash%20Kamdi&amp;am=150&amp;cu=INR&amp;tn=PeakPune%20Meet%201st','tez://upi/pay?pa=aakash.kamdi%40superyes&amp;pn=Aakash%20Kamdi&amp;am=150&amp;cu=INR&amp;tn=PeakPune%20Meet%201st','phonepe://pay?pa=aakash.kamdi%40superyes&amp;pn=Aakash%20Kamdi&amp;am=150&amp;cu=INR&amp;tn=PeakPune%20Meet%201st','data-copy-upi="aakash.kamdi@superyes"','Copy UPI ID','meet-payment.js','Paid%20Rs%20150%20for%20the%20First%20Meet.%20My%20name%3A%20','Aakash confirms your spot','He’ll add you to the group','twitter:image','og:image']) assert.ok(html.includes(s),s);
  for(const [handle,url] of [['@shreyashuks','https://instagram.com/shreyashuks'],['@dotslashaakash','https://instagram.com/dotslashaakash']]) assert.match(html,new RegExp(`<a class="mt-host-btn" href="${url}" target="_blank" rel="noopener noreferrer">${handle}<\\/a>`));
  for(const s of ['mt-form','mt-spots','Place TBC','12 spots','Meet Nº 1 · Admin','5:30 PM','Shivajinagar park','paytmmp','Paytm']) assert.ok(!html.includes(s),s);
  assert.throws(() => read('../functions/api/meet-rsvp.js'));
  assert.match(read('../public/meet-payment.svg'), /viewBox=\"0 0 61 61\"/);
  assert.ok(read('../scripts/generate-meet-qr.mjs').includes("errorCorrectionLevel: 'H'"));
  assert.ok(read('../scripts/generate-meet-qr.mjs').includes('tn=PeakPune%20Meet%201st'));
});
test('meet Event JSON-LD has a place and time but no invented date',()=>{
  const out=mkdtempSync(join(tmpdir(),'pp-meet-schema-')); build({outDir:out});
  const html=readFileSync(join(out,'meet/index.html'),'utf8');
  const graph=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(x=>JSON.parse(x[1]));
  const event=graph.flatMap(g=>g['@graph']||[]).find(x=>x['@type']==='Event');
  assert.equal(event.location.name,'Shivajinagar, Pune'); assert.equal(event.startDate,'2026-11-28T15:30:00+05:30'); assert.ok(!('startTime' in event)); assert.ok(!JSON.stringify(event).includes('streetAddress'));
});
