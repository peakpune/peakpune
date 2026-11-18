import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import * as api from '../functions/_lib/api.js';
import * as bapi from '../functions/_lib/birthdays-api.js';
import { validateBirthday, validateInterest } from '../src/birthday-submission.js';

// D1-shaped adapter over real SQLite so the production SQL is what runs.
function makeDB({ withBirthdays = true } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_plans.sql', import.meta.url), 'utf8'));
  if (withBirthdays) db.exec(readFileSync(new URL('../migrations/0002_birthdays.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (sql) => stmt(sql) };
}
const NOW = new Date('2026-11-14T10:00:00Z');
const PASS = 'correct horse battery staple';
const mkEnv = (extra = {}) => ({ DB: makeDB(), ADMIN_PASSPHRASE: PASS, ...extra });
const post = (url, body, { ip = '1.1.1.1', headers = {} } = {}) => new Request('https://peakpune.test' + url, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...headers }, body: JSON.stringify(body) });
const get = (url, headers = {}) => new Request('https://peakpune.test' + url, { headers });
const BDAY = { first_name: 'Aakash', last_name: 'Kamdi', wa_name: 'Aakash K', phone: '+91 98765 43210', instagram: '@aakash.k', dob_day: 15, dob_month: 6, dob_year: 1995, wish: 'A morning trek and a small dinner', likes: 'Filter coffee and old Hindi music', call_reason: '', show_age: false, t: '0' };
const submit = (env, body = BDAY, o) => bapi.submitBirthday(post('/api/birthdays', body, o), env, NOW);
const list = async (env) => (await (await bapi.listBirthdays(get('/api/birthdays'), env, NOW)).json()).birthdays;
const envC = new WeakMap();
const cookie = async (env) => {
  if (!envC.get(env)) {
    const r = await api.adminLogin(post('/api/admin/login', { passphrase: PASS }), env, NOW);
    assert.equal(r.status, 200);
    envC.set(env, r.headers.get('set-cookie').split(';')[0]);
  }
  return { cookie: envC.get(env) };
};
const adminList = async (env) => (await (await bapi.adminListBirthdays(get('/api/admin/birthdays', await cookie(env)), env, NOW)).json()).birthdays;
const decide = async (env, id, action) => bapi.adminDecideBirthday(post('/api/admin/birthdays-decide', { id, action }, { headers: await cookie(env) }), env, NOW);

test('submission is stored pending and is NOT public until approved', async () => {
  const env = mkEnv();
  const r = await submit(env); assert.equal(r.status, 200);
  assert.deepEqual(await list(env), []);
  const [b] = await adminList(env); assert.equal(b.name, 'Aakash Kamdi'); assert.equal(b.status, 'pending');
});

test('full path: submit, approve, public card, reject hides again', async () => {
  const env = mkEnv(); await submit(env);
  const [b] = await adminList(env);
  assert.equal((await decide(env, b.id, 'approve')).status, 200);
  const pub = await list(env); assert.equal(pub.length, 1);
  assert.equal(pub[0].name, 'Aakash K.');
  assert.deepEqual(Object.keys(pub[0]).sort(), ['age', 'day', 'id', 'likes', 'month', 'name', 'note', 'wish']);
  assert.equal(pub[0].age, null); // show_age was false
  await decide(env, b.id, 'reject'); assert.deepEqual(await list(env), []);
});

test('public wall never exposes phone, instagram, birth year, ip hash or offers', async () => {
  const env = mkEnv(); await submit(env); const [b] = await adminList(env); await decide(env, b.id, 'approve');
  await bapi.submitInterest(post('/api/birthday-interest', { birthday_id: b.id, kind: 'host', name: 'Ria', phone: '+91 90000 00000' }), env, NOW);
  const text = await (await bapi.listBirthdays(get('/api/birthdays'), env, NOW)).text();
  assert.doesNotMatch(text, /98765|43210|aakash\.k|1995|ip_hash|Ria|90000/);
});

test('age appears only when the person opted in', async () => {
  const env = mkEnv();
  await submit(env, { ...BDAY, show_age: true });
  const [b] = await adminList(env); await decide(env, b.id, 'approve');
  const [card] = await list(env);
  assert.equal(card.age, 2027 - 1995); // next 15 June after 14 Nov 2026 is in 2027
});

test('honeypot and too-fast submits get fake success, nothing stored', async () => {
  const env = mkEnv();
  assert.equal((await submit(env, { ...BDAY, website: 'http://spam' })).status, 200);
  assert.equal((await submit(env, { ...BDAY, t: String(NOW.getTime() - 500) })).status, 200);
  assert.deepEqual(await adminList(env), []);
});

test('validator rejects missing fields, bad phone, bad instagram, impossible dates', () => {
  const opt = { now: NOW };
  assert.match(validateBirthday({ ...BDAY, last_name: '' }, opt).errors.join(), /last_name required/);
  assert.match(validateBirthday({ ...BDAY, wa_name: '' }, opt).errors.join(), /wa_name required/);
  assert.match(validateBirthday({ ...BDAY, phone: 'not a number' }, opt).errors.join(), /phone/);
  assert.match(validateBirthday({ ...BDAY, instagram: 'not a handle!' }, opt).errors.join(), /instagram/);
  assert.match(validateBirthday({ ...BDAY, dob_day: 30, dob_month: 2, dob_year: 1995 }, opt).errors.join(), /date of birth invalid/);
  assert.match(validateBirthday({ ...BDAY, dob_year: 1899 }, opt).errors.join(), /birth year invalid/);
  assert.match(validateBirthday({ ...BDAY, wish: '' }, opt).errors.join(), /wish required/);
});

test('rate limit applies to birthday submissions', async () => {
  const env = mkEnv();
  for (let i = 0; i < 5; i++) await submit(env);
  const r = await submit(env);
  assert.equal(r.status, 429);
});

test('member offers are private, validated and deduplicated', async () => {
  const env = mkEnv(); await submit(env); const [b] = await adminList(env); await decide(env, b.id, 'approve');
  assert.equal(validateInterest({ kind: 'spam', name: 'X', phone: '+91 90000 00000' }).store, false);
  const bad = await bapi.submitInterest(post('/api/birthday-interest', { birthday_id: b.id, kind: 'join', name: '', phone: 'x' }), env, NOW);
  assert.equal(bad.status, 400);
  for (let i = 0; i < 2; i++) await bapi.submitInterest(post('/api/birthday-interest', { birthday_id: b.id, kind: 'plan', name: 'Ria', phone: '+91 90000 00000' }), env, NOW);
  const [after] = await adminList(env);
  assert.deepEqual(after.offers.map((o) => [o.kind, o.name, o.phone]), [['plan', 'Ria', '+91 90000 00000']]);
  // Offers on a card that is not approved are refused.
  const env2 = mkEnv(); await submit(env2); const [p] = await adminList(env2);
  const r = await bapi.submitInterest(post('/api/birthday-interest', { birthday_id: p.id, kind: 'join', name: 'Ria', phone: '+91 90000 00000' }), env2, NOW);
  assert.equal(r.status, 404);
});

test('admin list and decide require the signed owner session', async () => {
  const env = mkEnv(); await submit(env);
  assert.equal((await bapi.adminListBirthdays(get('/api/admin/birthdays'), env, NOW)).status, 403);
  assert.equal((await bapi.adminDecideBirthday(post('/api/admin/birthdays-decide', { id: 'x', action: 'approve' }), env, NOW)).status, 403);
});

test('missing birthdays table degrades to 503, never an exception', async () => {
  const env = { DB: makeDB({ withBirthdays: false }), ADMIN_PASSPHRASE: PASS };
  assert.equal((await submit(env)).status, 503);
  assert.equal((await bapi.listBirthdays(get('/api/birthdays'), env, NOW)).status, 503);
  const r = await bapi.submitInterest(post('/api/birthday-interest', { birthday_id: 'x', kind: 'join', name: 'Ria', phone: '+91 90000 00000' }), env, NOW);
  assert.ok([404, 503].includes(r.status));
});
