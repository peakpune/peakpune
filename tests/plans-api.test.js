import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import * as api from '../functions/_lib/api.js';
import { FIX } from './fixtures-images.js';

// D1-shaped adapter over real SQLite so the production SQL is what runs.
function makeDB() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_plans.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args.map(x => x instanceof ArrayBuffer ? new Uint8Array(x) : x)); return { meta: { changes: Number(r.changes) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (sql) => stmt(sql), raw: db };
}
const NOW = new Date('2026-11-14T10:00:00Z');
const key = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', key.publicKey)), kid: 'k1' };
const fetchKeys = async () => [jwk];
const b64u = (b) => Buffer.from(b).toString('base64url');
async function jwt(over = {}, signKey = key.privateKey) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' }));
  const p = b64u(JSON.stringify({ aud: ['AUD1'], iss: 'https://team.cloudflareaccess.com', email: 'owner@example.com', exp: NOW.getTime() / 1000 + 600, ...over }));
  const s = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', signKey, new TextEncoder().encode(h + '.' + p));
  return `${h}.${p}.${b64u(s)}`;
}
const mkEnv = (extra = {}) => ({ DB: makeDB(), HASH_SALT: 'salt', ADMIN_EMAIL: 'owner@example.com', ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'AUD1', ...extra });
const PLAN = { title: 'Sunday run at Baner hill', date: '2026-11-16', time: '06:30', area: 'Baner', venue: 'Gate 2', link: 'https://example.com/run' };
const post = (url, body, { ip = '1.1.1.1', headers = {} } = {}) => new Request('https://peakpune.test' + url, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip, ...headers }, body: JSON.stringify(body) });
const get = (url, headers = {}) => new Request('https://peakpune.test' + url, { headers });
const submit = (env, body = PLAN, o) => api.submitPlan(post('/api/plans', body, o), env, NOW);
const list = async (env) => (await (await api.listPlans(get('/api/plans'), env, NOW)).json()).plans;
const admin = async (extra) => ({ 'cf-access-jwt-assertion': await jwt(extra) });
const decide = async (env, id, action, extra, h) => api.adminDecide(post('/api/admin/decide', { id, action }, { headers: h ?? (await admin(extra)) }), env, NOW, fetchKeys);
const pending = async (env) => (await (await api.adminList(get('/api/admin/list', await admin()), env, NOW, fetchKeys)).json()).plans;

test('submission is stored pending and is NOT public until approved', async () => {
  const env = mkEnv();
  const r = await submit(env); assert.equal(r.status, 200);
  assert.deepEqual(await list(env), []);
  const [p] = await pending(env); assert.equal(p.title, PLAN.title);
});
test('full path: submit, approve, public, reject hides again', async () => {
  const env = mkEnv(); await submit(env);
  const [p] = await pending(env);
  assert.equal((await decide(env, p.id, 'approve')).status, 200);
  const pub = await list(env); assert.equal(pub.length, 1);
  assert.match(pub[0].note, /not organiser-confirmed/);
  assert.deepEqual(Object.keys(pub[0]).sort(), ['area', 'date', 'going', 'id', 'image', 'link', 'note', 'time', 'title', 'venue']);
  await decide(env, p.id, 'reject'); assert.deepEqual(await list(env), []);
});
test('public listing never exposes ip hash, status internals or contact', async () => {
  const env = mkEnv(); await submit(env); const [p] = await pending(env); await decide(env, p.id, 'approve');
  const text = await (await api.listPlans(get('/api/plans'), env, NOW)).text();
  assert.doesNotMatch(text, /ip_hash|salt|created_at|1\.1\.1\.1/);
});
test('past plans are not shown even if approved', async () => {
  const env = mkEnv(); await submit(env); const [p] = await pending(env); await decide(env, p.id, 'approve');
  const later = new Date('2026-11-20T10:00:00Z');
  assert.deepEqual((await (await api.listPlans(get('/api/plans'), env, later)).json()).plans, []);
});
test('honeypot: fake success, nothing stored', async () => {
  const env = mkEnv(); const r = await submit(env, { ...PLAN, website: 'http://spam' });
  assert.equal(r.status, 200); assert.equal((await pending(env)).length, 0);
});
test('too-fast submit is dropped silently', async () => {
  const env = mkEnv(); const r = await submit(env, { ...PLAN, t: String(NOW.getTime() - 500) });
  assert.equal(r.status, 200); assert.equal((await pending(env)).length, 0);
});
test('rate limit: 6th submission in an hour from one IP is refused; another IP is fine', async () => {
  const env = mkEnv(); const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await submit(env)).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429, 429]);
  assert.equal((await submit(env, PLAN, { ip: '2.2.2.2' })).status, 200);
});
test('contact details and bad input are rejected with 400', async () => {
  const env = mkEnv();
  for (const bad of [{ ...PLAN, title: 'call 98765 43210' }, { ...PLAN, area: 'me@x.com' }, { ...PLAN, link: 'http://x.com' }, { ...PLAN, link: 'javascript:alert(1)' }, { ...PLAN, date: '2026-11-01' }, {}])
    assert.equal((await submit(env, bad, { ip: '8.8.' + Math.random() })).status, 400);
  assert.equal((await pending(env)).length, 0);
});
test('stored script text is data, returned as JSON strings (client renders with textContent)', async () => {
  const env = mkEnv(); await submit(env, { ...PLAN, title: '<img src=x onerror=alert(1)>' });
  const [p] = await pending(env); await decide(env, p.id, 'approve');
  assert.equal((await list(env))[0].title, '<img src=x onerror=alert(1)>');
});
test('cross-origin POST is refused', async () => {
  const env = mkEnv(); const r = await api.submitPlan(post('/api/plans', PLAN, { headers: { origin: 'https://evil.test' } }), env, NOW);
  assert.equal(r.status, 403);
});
test('fails closed when unconfigured', async () => {
  assert.equal((await api.submitPlan(post('/api/plans', PLAN), { DB: makeDB() }, NOW)).status, 503);
});
test('admin: no token, wrong email, wrong aud, expired, bad signature, unconfigured => 403', async () => {
  const env = mkEnv(); await submit(env); const [p] = await pending(env);
  const other = (await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])).privateKey;
  const cases = [{}, { 'cf-access-jwt-assertion': await jwt({ email: 'x@example.com' }) }, { 'cf-access-jwt-assertion': await jwt({ aud: ['NOPE'] }) },
    { 'cf-access-jwt-assertion': await jwt({ exp: 1 }) }, { 'cf-access-jwt-assertion': await jwt({}, other) }, { 'cf-access-jwt-assertion': await jwt({ iss: 'https://evil' }) }];
  for (const h of cases) {
    assert.equal((await decide(env, p.id, 'approve', {}, h)).status, 403);
    assert.equal((await api.adminList(get('/api/admin/list', h), env, NOW, fetchKeys)).status, 403);
  }
  const open = { ...env, ACCESS_AUD: '' };
  assert.equal((await api.adminList(get('/api/admin/list', await admin()), open, NOW, fetchKeys)).status, 403);
  assert.deepEqual(await list(env), []);
});
test('admin decide rejects form posts and cross-origin', async () => {
  const env = mkEnv(); await submit(env); const [p] = await pending(env); const h = await admin();
  const form = new Request('https://peakpune.test/api/admin/decide', { method: 'POST', headers: { ...h, 'content-type': 'text/plain' }, body: JSON.stringify({ id: p.id, action: 'approve' }) });
  assert.equal((await api.adminDecide(form, env, NOW, fetchKeys)).status, 403);
  assert.equal((await decide(env, p.id, 'approve', undefined, { ...h, origin: 'https://evil.test' })).status, 403);
});
test('reports go to the private owner queue only; they never hide a plan automatically', async () => {
  const env = mkEnv(); await submit(env); const [p] = await pending(env); await decide(env, p.id, 'approve');
  for (const ip of ['3.3.3.3', '4.4.4.4', '4.4.4.4', '5.5.5.5', '6.6.6.6']) await api.reportPlan(post('/api/report', { plan_id: p.id }, { ip }), env, NOW);
  assert.equal((await list(env)).length, 1);
  const q = await pending(env); assert.equal(q[0].reports, 4);
  await decide(env, p.id, 'reject'); assert.equal((await list(env)).length, 0);
});
test('report of unapproved/unknown plan is 404', async () => {
  const env = mkEnv(); await submit(env); const [p] = await pending(env);
  assert.equal((await api.reportPlan(post('/api/report', { plan_id: p.id }), env, NOW)).status, 404);
});
test('going: one per visitor, approximate label, only approved plans, no phone numbers anywhere', async () => {
  const env = mkEnv(); await submit(env); const [p] = await pending(env);
  assert.equal((await api.markGoing(post('/api/going', { plan_id: p.id }), env, NOW)).status, 404);
  await decide(env, p.id, 'approve');
  const g = async (ip) => (await (await api.markGoing(post('/api/going', { plan_id: p.id }, { ip }), env, NOW)).json()).going;
  assert.equal(await g('9.0.0.1'), 'A few going'); assert.equal(await g('9.0.0.1'), 'A few going');
  for (let i = 2; i <= 7; i++) await g('9.0.0.' + i);
  assert.equal((await list(env))[0].going, '5+ going');
  assert.equal(api.goingLabel(0), ''); assert.equal(api.goingLabel(12), '10+ going');
  const cols = env.DB.raw.prepare("SELECT name FROM pragma_table_info('going')").all().map((c) => c.name);
  assert.deepEqual(cols, ['plan_id', 'ip_hash', 'created_at']);
});
function multipart(fields, file, ip = '1.1.1.1') {
  const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append('image', new Blob([file.bytes], { type: file.type }), 'a.' + file.ext);
  return new Request('https://peakpune.test/api/plans', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: fd });
}
test('image: metadata is stripped server-side, stored privately, served only after approval', async () => {
  const bytes = Buffer.from(FIX.jpg, 'base64');
  assert.ok(bytes.includes(Buffer.from('Exif')));
  const env = mkEnv();
  const r = await api.submitPlan(multipart(PLAN, { bytes, type: 'image/jpeg', ext: 'jpg' }), env, NOW); assert.equal(r.status, 200);
  const stored = env.DB.raw.prepare('SELECT bytes FROM images').get().bytes; assert.ok(!Buffer.from(stored).includes(Buffer.from('Exif')));
  const [p] = await pending(env);
  assert.match(p.image, /^\/api\/admin\/image/);
  assert.equal((await api.adminImage(get(p.image), env, NOW, fetchKeys)).status, 403);
  assert.equal((await api.adminImage(get(p.image, await admin()), env, NOW, fetchKeys)).status, 200);
  assert.equal((await api.publicImage(get('/x'), env, p.id)).status, 404);
  await decide(env, p.id, 'approve');
  const img = await api.publicImage(get('/x'), env, p.id); assert.equal(img.status, 200);
  assert.equal(img.headers.get('x-content-type-options'), 'nosniff');
});
test('image: junk, wrong type, oversize rejected, nothing stored', async () => {
  const env = mkEnv();
  assert.equal((await api.submitPlan(multipart(PLAN, { bytes: Buffer.from('<svg onload=alert(1)>'.padEnd(40)), type: 'image/svg+xml', ext: 'svg' }), env, NOW)).status, 400);
  assert.equal((await api.submitPlan(multipart(PLAN, { bytes: Buffer.alloc(1100 * 1024, 1), type: 'image/jpeg', ext: 'jpg' }), env, NOW)).status, 400);
  assert.equal(env.DB.raw.prepare('SELECT COUNT(*) c FROM images').get().c, 0); assert.equal((await pending(env)).length, 0);
});
test('IPs are stored only as salted hashes', async () => {
  const env = mkEnv(); await submit(env, PLAN, { ip: '203.0.113.7' });
  const row = env.DB.raw.prepare('SELECT * FROM plans').get(); const rate = env.DB.raw.prepare('SELECT * FROM rate').get();
  assert.doesNotMatch(JSON.stringify([row, rate]), /203\.0\.113\.7/);
});
