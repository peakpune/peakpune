import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import * as api from '../functions/_lib/pools-api.js';
import { validatePool, validateJoin } from '../src/pool-submission.js';

function makeDB() {
  const db = new DatabaseSync(':memory:');
  for (const f of ['0001_plans.sql', '0003_pools.sql']) db.exec(readFileSync(new URL('../migrations/' + f, import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (sql) => stmt(sql), raw: db };
}
const NOW = new Date('2026-11-25T10:00:00Z'); // 15:30 IST, Wed 25 Nov 2026
const mkEnv = () => ({ DB: makeDB(), ADMIN_PASSPHRASE: 'x' });
const post = (url, body, ip = '1.1.1.1') => new Request('https://peakpune.test' + url, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: JSON.stringify(body) });
const POOL = { film: 'Dune: Part Three', date: '2026-11-28', target: 3, area: 'Baner', options: [{ cinema: 'PVR Pavilion', time: '19:30' }, { cinema: 'Cinepolis Seasons', time: '20:15' }], link: '' };
const mk = (env, b = POOL, ip) => api.submitPool(post('/api/pools', b, ip), env, NOW);
const list = async (env) => (await (await api.listPools(new Request('https://peakpune.test/api/pools'), env, NOW)).json()).pools;
const join = (env, b, ip) => api.joinPool(post('/api/pool-join', b, ip), env, NOW);

test('a pool goes live straight away, starter counts as first person, nothing personal is exposed', async () => {
  const env = mkEnv(); assert.equal((await mk(env)).status, 200);
  const [p] = await list(env);
  assert.equal(p.film, POOL.film); assert.equal(p.joined, 1); assert.equal(p.on, false);
  assert.deepEqual(p.shows.map((s) => s.count), [1, 1]);
  assert.deepEqual(Object.keys(p).sort(), ['areas', 'book', 'date', 'film', 'id', 'joined', 'lead', 'note', 'on', 'shows', 'target']);
  assert.equal(p.book, 'https://www.district.in/movies/pune-movie-tickets');
  assert.match(p.note, /not a booking service/);
  assert.doesNotMatch(JSON.stringify(p), /ip_hash|[0-9a-f]{32}/);
});
test('joining picks shows and area; the show that fills first is on; re-join updates, never doubles', async () => {
  const env = mkEnv(); await mk(env); const [p] = await list(env);
  assert.equal((await join(env, { pool_id: p.id, area: 'Kharadi', options: [1] }, '2.2.2.2')).status, 200);
  assert.equal((await join(env, { pool_id: p.id, area: 'Kothrud', options: [1] }, '3.3.3.3')).status, 200);
  let [q] = await list(env);
  assert.equal(q.joined, 3); assert.deepEqual(q.shows.map((s) => s.count), [1, 3]);
  assert.equal(q.lead, 1); assert.equal(q.on, true);
  assert.deepEqual(q.areas.map((a) => a.area).sort(), ['Baner', 'Kharadi', 'Kothrud']);
  await join(env, { pool_id: p.id, area: 'Kothrud', options: [0] }, '3.3.3.3');
  [q] = await list(env); assert.equal(q.joined, 3); assert.deepEqual(q.shows.map((s) => s.count), [2, 2]);
});
test('join rejects unknown pool, bad area, no show, show that does not exist', async () => {
  const env = mkEnv(); await mk(env); const [p] = await list(env);
  assert.equal((await join(env, { pool_id: 'nope', area: 'Baner', options: [0] })).status, 404);
  assert.equal((await join(env, { pool_id: p.id, area: 'Mars', options: [0] })).status, 400);
  assert.equal((await join(env, { pool_id: p.id, area: 'Baner', options: [] })).status, 400);
  assert.equal((await join(env, { pool_id: p.id, area: 'Baner', options: [2] })).status, 400);
});
test('validation: past date, past show today, too far, contact details, bad link, bad size, duplicates', () => {
  const v = (o) => validatePool({ ...POOL, ...o }, { now: NOW });
  assert.equal(v({}).ok, true);
  assert.match(v({ date: '2026-11-24' }).errors.join(), /past/);
  assert.match(v({ date: '2026-11-25', options: [{ cinema: 'PVR', time: '15:00' }] }).errors.join(), /passed/);
  assert.equal(v({ date: '2026-11-25', options: [{ cinema: 'PVR', time: '21:00' }] }).ok, true);
  assert.match(v({ date: '2027-02-01' }).errors.join(), /days away/);
  assert.match(v({ film: 'call 9876543210' }).errors.join(), /contact/);
  assert.match(v({ options: [{ cinema: 'mail me a@b.co', time: '19:00' }] }).errors.join(), /contact/);
  assert.match(v({ link: 'https://evil.example/x' }).errors.join(), /District/);
  assert.equal(v({ link: 'https://www.district.in/movies/dune-movie-tickets-in-pune-MV1' }).ok, true);
  assert.match(v({ target: 1 }).errors.join(), /group size/);
  assert.match(v({ target: 13 }).errors.join(), /group size/);
  assert.match(v({ options: [] }).errors.join(), /shows/);
  assert.match(v({ options: [POOL.options[0], POOL.options[0]] }).errors.join(), /duplicate/);
  assert.equal(validateJoin({ area: 'Baner', options: [0, 0, 1] }).mask, 3);
});
test('expired pools and shows disappear; reported pools hide at 3 reports', async () => {
  const env = mkEnv();
  await mk(env, { ...POOL, date: '2026-11-25', options: [{ cinema: 'PVR', time: '16:00' }, { cinema: 'INOX', time: '21:00' }] });
  let pools = await list(env); assert.deepEqual(pools[0].shows.map((s) => s.cinema), ['PVR', 'INOX']);
  const later = new Date('2026-11-25T11:00:00Z'); // 16:30 IST
  pools = (await (await api.listPools(new Request('https://peakpune.test/api/pools'), env, later)).json()).pools;
  assert.deepEqual(pools[0].shows.map((s) => s.cinema), ['INOX']);
  const tomorrow = new Date('2026-11-26T05:00:00Z');
  assert.deepEqual((await (await api.listPools(new Request('https://peakpune.test/api/pools'), env, tomorrow)).json()).pools, []);
  const env2 = mkEnv(); await mk(env2); const [p] = await list(env2);
  for (const ip of ['5.5.5.1', '5.5.5.2', '5.5.5.3']) await api.reportPool(post('/api/pool-report', { pool_id: p.id }, ip), env2, NOW);
  assert.deepEqual(await list(env2), []);
});
test('honeypot and fast fill store nothing; cross-origin blocked; rate limited; no db is 503', async () => {
  const env = mkEnv();
  assert.equal((await mk(env, { ...POOL, website: 'x' })).status, 200);
  assert.equal((await mk(env, { ...POOL, t: String(NOW.getTime() - 500) })).status, 200);
  assert.deepEqual(await list(env), []);
  const bad = new Request('https://peakpune.test/api/pools', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://evil.example' }, body: JSON.stringify(POOL) });
  assert.equal((await api.submitPool(bad, env, NOW)).status, 403);
  let last; for (let i = 0; i < 7; i++) last = await mk(env, { ...POOL, film: 'F' + i }, '9.9.9.9');
  assert.equal(last.status, 429);
  assert.equal((await api.submitPool(post('/api/pools', POOL), {}, NOW)).status, 503);
  assert.deepEqual(await (await api.listPools(new Request('https://x'), {}, NOW)).json(), { pools: [] });
});
