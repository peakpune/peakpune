import test from 'node:test';import assert from 'node:assert/strict';
import {sharePlan} from '../public/share.js';
const p={title:'Bolly House Night',url:'https://www.district.in/events/x'};
test('native share gets this card title and url',async()=>{
 let got;const r=await sharePlan(p,{share:async d=>{got=d;}});
 assert.equal(r,'shared');assert.deepEqual(got,{title:'Bolly House Night - Peak Pune',text:'Pune plan: Bolly House Night',url:p.url});
});
test('cancelled native share does nothing and does not copy',async()=>{
 let copied=false;
 const r=await sharePlan(p,{share:async()=>{throw Object.assign(new Error('x'),{name:'AbortError'});},clipboard:{writeText:async()=>{copied=true;}}});
 assert.equal(r,'cancelled');assert.equal(copied,false);
});
test('native share error falls back to copy',async()=>{
 let t;const r=await sharePlan(p,{share:async()=>{throw new Error('nope');},clipboard:{writeText:async x=>{t=x;}}});
 assert.equal(r,'copied');assert.equal(t,p.url);
});
test('no share: clipboard success, failure, and neither',async()=>{
 let t;assert.equal(await sharePlan(p,{clipboard:{writeText:async x=>{t=x;}}}),'copied');assert.equal(t,p.url);
 assert.equal(await sharePlan(p,{clipboard:{writeText:async()=>{throw new Error('blocked');}}}),'failed');
 assert.equal(await sharePlan(p,{}),'unavailable');
});
