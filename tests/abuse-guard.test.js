import test from 'node:test';import assert from 'node:assert/strict';
import {isHoneypotTripped,honeypotFieldHtml,checkLimits,screenSubmission} from '../src/abuse-guard.js';
test('honeypot trips only when the hidden field has content',()=>{
 assert.equal(isHoneypotTripped({website:'http://spam.example'}),true);
 assert.equal(isHoneypotTripped({website:'  '}),false);
 assert.equal(isHoneypotTripped({website:''}),false);
 assert.equal(isHoneypotTripped({title:'x'}),false);
 assert.equal(isHoneypotTripped(null),false);
 assert.equal(isHoneypotTripped('website'),false);
});
test('hidden field markup is off-screen and rejects unsafe names',()=>{
 const h=honeypotFieldHtml();
 assert.match(h,/name="website"/);assert.match(h,/tabindex="-1"/);assert.match(h,/aria-hidden="true"/);
 assert.throws(()=>honeypotFieldHtml('x"><script>'),TypeError);
});
test('limits: per-IP hourly and total cap',()=>{
 assert.equal(checkLimits({ipCountThisHour:5,totalEntries:1}).ok,true);
 assert.equal(checkLimits({ipCountThisHour:6,totalEntries:1}).status,429);
 assert.equal(checkLimits({ipCountThisHour:1,totalEntries:5001}).status,503);
});
test('screenSubmission fakes success for bots without storing',()=>{
 assert.deepEqual(screenSubmission({website:'x'},{ipCountThisHour:99,totalEntries:99999}),{ok:true,store:false,status:200});
 assert.equal(screenSubmission({title:'a'},{ipCountThisHour:1,totalEntries:1}).store,true);
 assert.equal(screenSubmission({title:'a'},{ipCountThisHour:9,totalEntries:1}).status,429);
});
test('abuse guard is not wired into any page or script',async()=>{
 const {readdirSync,readFileSync}=await import('node:fs');
 for(const d of ['public','scripts']) for(const f of readdirSync(d)) if(/\.(js|mjs|html)$/.test(f)) assert.ok(!readFileSync(d+'/'+f,'utf8').includes('abuse-guard'),f);
});
