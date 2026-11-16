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
import {nextWeekendRange,nextMonthRange,nextQuarterRange,inRange} from '../public/lib/filters.js';
test('rolling windows follow the IST date',()=>{
 assert.deepEqual(nextWeekendRange('2026-11-17'),{from:'2026-11-27',to:'2026-11-29'});
 assert.deepEqual(nextWeekendRange('2026-11-21'),{from:'2026-11-27',to:'2026-11-29'});
 assert.deepEqual(nextMonthRange('2026-11-17'),{from:'2026-12-01',to:'2026-12-31'});
 assert.deepEqual(nextMonthRange('2026-12-31'),{from:'2027-01-01',to:'2027-01-31'});
 assert.deepEqual(nextQuarterRange('2026-11-17'),{from:'2027-01-01',to:'2027-03-31'});
 assert.deepEqual(nextQuarterRange('2026-02-01'),{from:'2026-04-01',to:'2026-06-30'});
 assert.equal(inRange({date:'2026-12-05'},'nextmonth','2026-11-17'),true);
 assert.equal(inRange({date:'2026-11-20'},'nextmonth','2026-11-17'),false);
});
