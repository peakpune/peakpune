import test from 'node:test';import assert from 'node:assert/strict';
import {weekendRange,isWeekend} from '../public/filters.js';
test('weekend range from each weekday (2026-11-13 is Friday)',()=>{
 assert.deepEqual(weekendRange('2026-11-09'),{from:'2026-11-13',to:'2026-11-15'});
 assert.deepEqual(weekendRange('2026-11-12'),{from:'2026-11-13',to:'2026-11-15'});
 assert.deepEqual(weekendRange('2026-11-13'),{from:'2026-11-13',to:'2026-11-15'});
 assert.deepEqual(weekendRange('2026-11-14'),{from:'2026-11-14',to:'2026-11-15'});
 assert.deepEqual(weekendRange('2026-11-15'),{from:'2026-11-15',to:'2026-11-15'});
 assert.deepEqual(weekendRange('2026-11-16'),{from:'2026-11-20',to:'2026-11-22'});
});
test('weekend filter uses the single listed date only',()=>{
 assert.equal(isWeekend({date:'2026-11-14'},'2026-11-13'),true);
 assert.equal(isWeekend({date:'2026-11-16'},'2026-11-13'),false);
 assert.equal(isWeekend({},'2026-11-13'),false);
 assert.throws(()=>weekendRange('2026-02-30'),TypeError);
});
