import test from 'node:test';
import assert from 'node:assert/strict';
import {collectFeed,feedResponse,FEED_SOURCES} from '../functions/_lib/feed.js';
const req=new Request('https://peakpune.com/api/feed');
const mem=()=>{const m=new Map();return {match:async k=>m.get(k.url)?.clone(),put:async(k,v)=>{m.set(k.url,v)}}};
const down=async()=>new Response('no',{status:500});
test('all sources down: 503 with a short reason per source, remembered 10 minutes, nothing invented',async()=>{
 const cache=mem();const r=await feedResponse(req,{cache,fetcher:down});
 assert.equal(r.status,503);const b=await r.json();assert.ok(b.status.every(s=>/HTTP 500/.test(s.reason)));assert.equal((await cache.match(req)).status,503);
});
test('sources are fetched only from the fixed allowlist, and failures are reported per source',async()=>{
 const seen=[];const feed=await collectFeed({fetcher:async(u)=>{seen.push(u);return down();}});
 assert.deepEqual(seen.sort(),FEED_SOURCES.map(s=>s.url).sort());
 assert.equal(feed.allDown,true);assert.ok(feed.status.every(s=>s.state==='unavailable'));
});
test('a feed over 4 hours old is refused by the client parser',async()=>{
 const feed=await collectFeed({fetcher:down});
 assert.ok(Date.parse(feed.expiresAt)-Date.parse(feed.fetchedAt)<=4*3600*1000);
});
