import test from 'node:test';import assert from 'node:assert/strict';
import {validatePlan} from '../src/plan-submission.js';
const now=new Date('2026-11-14T10:00:00Z');
const ok={title:'Sunday run at Baner hill',date:'2026-11-16',time:'06:30',area:'Baner',venue:'Baner hill gate',link:'https://example.com/x'};
test('valid plan is stored as pending',()=>{const r=validatePlan(ok,{now});assert.equal(r.store,true);assert.equal(r.plan.status,'pending');});
test('honeypot gets fake success, nothing stored',()=>{const r=validatePlan({...ok,website:'x'},{now});assert.deepEqual([r.ok,r.store],[true,false]);});
test('too-fast submit is silently dropped',()=>{const r=validatePlan(ok,{now,startedAt:now.getTime()-500});assert.equal(r.store,false);assert.equal(r.status,200);});
test('rejects past date, bad link, contact details, missing fields',()=>{
 assert.match(validatePlan({...ok,date:'2026-11-01'},{now}).errors.join(),/past/);
 assert.match(validatePlan({...ok,link:'http://x.com'},{now}).errors.join(),/https/);
 assert.match(validatePlan({...ok,title:'call 98765 43210 now'},{now}).errors.join(),/contact/);
 assert.match(validatePlan({...ok,area:'a@b.com'},{now}).errors.join(),/contact/);
 assert.match(validatePlan({},{now}).errors.join(),/title required/);
});
test('rate limit applies',()=>{assert.equal(validatePlan(ok,{now,counters:{ipCountThisHour:9,totalEntries:1}}).status,429);});
