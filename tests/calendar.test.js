import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { when, addDays, googleUrl, ics } from '../scripts/calendar.mjs';

const safe = (v) => { try { return new URL(v).href; } catch { return null; } };
const base = { id: 'event-x', name: 'Run, walk; chat', summary: 'A summary', checked_at: '2026-11-13', url_deep: 'https://example.org/a', address: 'UNKNOWN', neighbourhood: 'Kamshet', status: 'verified' };

test('a listing with an exact start is timed in UTC and gets no invented end', () => {
  const w = when({ ...base, start_date: '2026-11-14', start: '2026-11-14T11:00:00+05:30', end: null });
  assert.deepEqual(w, { timed: true, start: '20261114T053000Z', end: null });
  assert.ok(!/DTEND/.test(ics([{ ...base, start_date: '2026-11-14', start: '2026-11-14T11:00:00+05:30' }], safe)));
});

test('a date-only listing is all-day with an exclusive end date, across month ends', () => {
  assert.deepEqual(when({ ...base, start_date: '2026-11-30', start: null, end: null }), { timed: false, start: '20261130', end: '20261201' });
  assert.equal(addDays('2026-12-31', 1), '20270101');
  const multi = when({ ...base, start_date: '2026-12-12', start: null, end: '2026-12-13T23:59:00+05:30' });
  assert.equal(multi.end, '20261214');
});

test('recurring listings have no calendar entry', () => {
  assert.equal(when({ ...base, start_date: null, recurrence: 'Daily' }), null);
  assert.equal(googleUrl({ ...base, start_date: null }, safe), null);
  assert.ok(!ics([{ ...base, start_date: null }], safe).includes('BEGIN:VEVENT'));
});

test('ics: escaped text, CRLF, folded lines of at most 75 octets, partial listings are tentative', () => {
  const text = ics([{ ...base, start_date: '2026-11-14', status: 'partial', summary: 'Long, '.repeat(40) + 'ünïcode ✓' }], safe);
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n') && text.endsWith('END:VCALENDAR\r\n'));
  assert.ok(text.includes('SUMMARY:Run\\, walk\\; chat'));
  assert.ok(text.includes('STATUS:TENTATIVE'));
  for (const line of text.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
  assert.ok(!/[^\r]\n/.test(text), 'every line ends in CRLF');
});

test('google link carries title, dates, details and a location, with the time zone only for timed events', () => {
  const timed = new URL(googleUrl({ ...base, start_date: '2026-11-14', start: '2026-11-14T16:00:00+05:30', end: '2026-11-15T08:00:00+05:30' }, safe));
  assert.equal(timed.origin + timed.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(timed.searchParams.get('dates'), '20261114T103000Z/20261115T023000Z');
  assert.equal(timed.searchParams.get('ctz'), 'Asia/Kolkata');
  assert.equal(timed.searchParams.get('location'), 'Kamshet, Pune');
  assert.ok(timed.searchParams.get('details').includes('confirm on the page'));
  const allDay = new URL(googleUrl({ ...base, start_date: '2026-11-15' }, safe));
  assert.equal(allDay.searchParams.get('dates'), '20261115/20261116');
  assert.equal(allDay.searchParams.get('ctz'), null);
});

test('the build writes one .ics per dated card plus the combined file, and the page links them', () => {
  const html = readFileSync('public/events/index.html', 'utf8');
  const cards = [...html.matchAll(/href="(\/calendar\/event-[^"]+\.ics)"/g)].map((m) => m[1]);
  assert.ok(cards.length >= 1);
  for (const c of cards) assert.ok(existsSync('public' + c), c);
  assert.ok(html.includes('/calendar/peak-pune-events.ics'));
  const files = readdirSync('public/calendar');
  assert.equal(files.length, cards.length + 1, 'no stale or withheld events in the calendar folder');
  const all = readFileSync('public/calendar/peak-pune-events.ics', 'utf8');
  assert.equal(all.split('BEGIN:VEVENT').length - 1, cards.length);
});
