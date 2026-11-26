import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import * as api from '../functions/_lib/meet-api.js';
import { validateRsvp } from '../src/meet-rsvp.js';

function makeDB() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_plans.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (sql) => stmt(sql), raw: db };
}
const NOW = new Date('2026-11-27T10:00:00Z');
const mkEnv = () => ({ DB: makeDB(), ADMIN_PASSPHRASE: 'x' });
const post = (body, ip = '1.1.1.1') => new Request('https://peakpune.test/api/meet-rsvp', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) });
const GOOD = { event: 'meet-1', name: 'Asha', day: 'sat', enjoy: ['laser','cafe'], note: 'Bring a friend' };
const count = async (env) => (await (await api.meetCount(new Request('https://peakpune.test/api/meet-rsvp'), env)).json()).count;

test('an RSVP is stored, counted and numbered, and the public count exposes nothing else', async () => {
  const env = mkEnv();
  const res = await api.submitMeetRsvp(post(GOOD), env, NOW);
  assert.equal(res.status, 200);
  const j = await res.json(); assert.equal(j.spot, 1); assert.equal(j.count, 1);
  const pub = JSON.stringify(await (await api.meetCount(new Request('https://peakpune.test/api/meet-rsvp'), env)).json());
  assert.ok(!pub.includes('Asha') && !pub.includes('laser'));
});

test('separate submissions are counted and keep optional choices', async () => {
  const env = mkEnv();
  await api.submitMeetRsvp(post(GOOD, '2.2.2.2'), env, NOW);
  await api.submitMeetRsvp(post({ ...GOOD, name: 'Mira', note: '' }, '3.3.3.3'), env, NOW);
  assert.equal(await count(env), 2);
});

test('honeypot stores nothing and bad input is rejected', async () => {
  const env = mkEnv();
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, website: 'http://spam' }), env, NOW)).status, 200);
  assert.equal(await count(env), 0);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, enjoy: [] }), env, NOW)).status, 400);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, name: '' }), env, NOW)).status, 400);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, day: 'never' }), env, NOW)).status, 400);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, event: 'nope' }), env, NOW)).status, 404);
});

test('caps first 12 spots, accepts later interest as waitlist, and closes at year end', async () => {
  const env = mkEnv();
  for (let i = 0; i < 12; i++) {
    const r = await api.submitMeetRsvp(post({ ...GOOD, name: 'Asha' + String.fromCharCode(65+i) }, `9.9.${i}.1`), env, NOW);
    assert.equal(r.status, 200, 'rsvp ' + i);
  }
  const overflow = await api.submitMeetRsvp(post({ ...GOOD, name: 'Extra' }, '8.8.8.8'), env, NOW);
  assert.equal(overflow.status, 200);
  assert.equal((await overflow.json()).waitlist, true);
  assert.equal(await count(env), 13);
  assert.equal(validateRsvp(GOOD, { now: new Date('2027-02-01T10:00:00Z') }).status, 410);
});

test('only the signed-in owner can read the list', async () => {
  const env = mkEnv(); await api.submitMeetRsvp(post(GOOD), env, NOW);
  assert.equal((await api.adminMeetRsvps(new Request('https://peakpune.test/api/admin/meet-rsvps'), env, NOW)).status, 403);
});
