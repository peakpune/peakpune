import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import * as api from '../functions/_lib/meet-api.js';
import { validateRsvp, normalizeWhatsApp } from '../src/meet-rsvp.js';

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
const GOOD = { event: 'meet-1', name: 'Asha', wa: '+91 98765 43210', bring: 'book' };
const count = async (env) => (await (await api.meetCount(new Request('https://peakpune.test/api/meet-rsvp'), env)).json()).count;

test('normalizes WhatsApp numbers', () => {
  assert.equal(normalizeWhatsApp('98765 43210'), '919876543210');
  assert.equal(normalizeWhatsApp('+91 98765-43210'), '919876543210');
  assert.equal(normalizeWhatsApp('12'), '');
});

test('an RSVP is stored, counted and numbered, and the public count exposes nothing else', async () => {
  const env = mkEnv();
  const res = await api.submitMeetRsvp(post(GOOD), env, NOW);
  assert.equal(res.status, 200);
  const j = await res.json(); assert.equal(j.spot, 1); assert.equal(j.count, 1);
  const pub = JSON.stringify(await (await api.meetCount(new Request('https://peakpune.test/api/meet-rsvp'), env)).json());
  assert.ok(!pub.includes('Asha') && !pub.includes('9876543210'));
});

test('the same number twice does not take a second spot', async () => {
  const env = mkEnv();
  await api.submitMeetRsvp(post(GOOD, '2.2.2.2'), env, NOW);
  const again = await (await api.submitMeetRsvp(post({ ...GOOD, name: 'Asha K' }, '3.3.3.3'), env, NOW)).json();
  assert.equal(again.again, true); assert.equal(await count(env), 1);
});

test('honeypot stores nothing and bad input is rejected', async () => {
  const env = mkEnv();
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, website: 'http://spam' }), env, NOW)).status, 200);
  assert.equal(await count(env), 0);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, wa: '123' }), env, NOW)).status, 400);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, name: '' }), env, NOW)).status, 400);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, bring: 'beer' }), env, NOW)).status, 400);
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, event: 'nope' }), env, NOW)).status, 404);
});

test('stops at 30 and closes when the meetup starts', async () => {
  const env = mkEnv();
  for (let i = 0; i < 30; i++) {
    const r = await api.submitMeetRsvp(post({ ...GOOD, wa: '98765' + String(10000 + i) }, `9.9.${i}.1`), env, NOW);
    assert.equal(r.status, 200, 'rsvp ' + i);
  }
  assert.equal((await api.submitMeetRsvp(post({ ...GOOD, wa: '9000000000' }, '8.8.8.8'), env, NOW)).status, 409);
  assert.equal(await count(env), 30);
  assert.equal(validateRsvp(GOOD, { now: new Date('2026-11-28T10:00:00Z') }).status, 410);
});

test('only the signed-in owner can read the list', async () => {
  const env = mkEnv(); await api.submitMeetRsvp(post(GOOD), env, NOW);
  assert.equal((await api.adminMeetRsvps(new Request('https://peakpune.test/api/admin/meet-rsvps'), env, NOW)).status, 403);
});
