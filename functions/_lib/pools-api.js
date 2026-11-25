// "Watch together" pools API. Pure handlers: (request, env, now) -> Response.
// Same storage and abuse model as plans: D1, salted IP hashes, hourly rate limit, honeypot.
// Pools go live straight away (no approval) and anyone can join and see everything at once.
// Headcounts only: no names, no contact details, no chat. Booking happens on District, not here.
import { json, newId, ipHash, sameOrigin, rateLimit, readJsonCapped } from './api.js';
import { validatePool, validateJoin, istDate, istTime, MIN_FILL_MS, DISTRICT_PUNE } from '../../src/pool-submission.js';
import { RATE_LIMIT_PER_HOUR, isHoneypotTripped } from '../../src/abuse-guard.js';

const JSON_CAP = 8 * 1024;
const MAX_LIVE = 500;
const HIDE_AT_REPORTS = 3;
export const POOL_NOTE = 'A guide, not a booking service. Peak Pune holds no seats and takes no payment. Everyone books their own tickets on District.';

async function readJson(request) {
  try { return { body: await readJsonCapped(request, JSON_CAP) }; }
  catch (e) { return { error: json({ error: e instanceof RangeError ? 'too large' : 'bad request' }, e instanceof RangeError ? 413 : 400) }; }
}
const ready = (env) => env.DB && (env.HASH_SALT || env.ADMIN_PASSPHRASE);
const missingTable = (e) => /no such table/i.test(String(e?.message ?? e));

export async function submitPool(request, env, now = new Date()) {
  if (!ready(env)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readJson(request); if (error) return error;
  const startedAt = body?.t ? Number(body.t) : undefined;
  if (isHoneypotTripped(body) || (Number.isFinite(startedAt) && now.getTime() - startedAt < MIN_FILL_MS)) return json({ ok: true });
  try {
    const hash = await ipHash(request, env);
    const live = (await env.DB.prepare('SELECT COUNT(*) AS c FROM pools WHERE date >= ?').bind(istDate(now)).first()).c;
    const r = validatePool(body, { now, counters: { ipCountThisHour: await rateLimit(env, hash, now), totalEntries: live > MAX_LIVE ? 1e9 : 0 } });
    if (!r.store) return r.errors ? json({ error: r.errors.join(', ') }, 400) : json({ error: r.error ?? 'rejected' }, r.status === 200 ? 400 : r.status);
    const p = r.pool, id = newId();
    await env.DB.prepare('INSERT INTO pools (id, film, date, target, link, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(id, p.film, p.date, p.target, p.link, now.getTime(), hash).run();
    for (const [i, o] of p.options.entries()) await env.DB.prepare('INSERT INTO pool_options (pool_id, idx, cinema, time) VALUES (?, ?, ?, ?)').bind(id, i, o.cinema, o.time).run();
    // The starter is the first person in, and every show they listed works for them.
    await env.DB.prepare('INSERT INTO pool_joins (pool_id, ip_hash, area, opts, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, hash, p.area, (1 << p.options.length) - 1, now.getTime()).run();
    return json({ ok: true, id });
  } catch (e) { if (missingTable(e)) return json({ error: 'unavailable' }, 503); throw e; }
}

export async function listPools(request, env, now = new Date()) {
  if (!env.DB) return json({ pools: [] });
  try {
    const today = istDate(now), nowT = istTime(now);
    const pools = (await env.DB.prepare('SELECT p.id, p.film, p.date, p.target, p.link, (SELECT COUNT(*) FROM pool_reports r WHERE r.pool_id = p.id) AS reports FROM pools p WHERE p.date >= ? ORDER BY p.date, p.created_at LIMIT 100').bind(today).all()).results;
    const out = [];
    for (const p of pools) {
      if (p.reports >= HIDE_AT_REPORTS) continue;
      const opts = (await env.DB.prepare('SELECT idx, cinema, time FROM pool_options WHERE pool_id = ? ORDER BY idx').bind(p.id).all()).results;
      const joins = (await env.DB.prepare('SELECT area, opts FROM pool_joins WHERE pool_id = ?').bind(p.id).all()).results;
      const shows = opts.filter((o) => p.date > today || o.time > nowT).map((o) => ({ idx: o.idx, cinema: o.cinema, time: o.time, count: joins.filter((j) => j.opts & (1 << o.idx)).length }));
      if (!shows.length) continue;
      const lead = shows.reduce((a, b) => (b.count > a.count ? b : a), shows[0]);
      const areas = {}; for (const j of joins) areas[j.area] = (areas[j.area] || 0) + 1;
      out.push({
        id: p.id, film: p.film, date: p.date, target: p.target, joined: joins.length, shows,
        areas: Object.entries(areas).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([area, count]) => ({ area, count })),
        lead: lead.idx, on: lead.count >= p.target,
        book: p.link || DISTRICT_PUNE, note: POOL_NOTE,
      });
    }
    return json({ pools: out }, 200, { 'cache-control': 'no-store' });
  } catch (e) { if (missingTable(e)) return json({ pools: [] }); throw e; }
}

export async function joinPool(request, env, now = new Date()) {
  if (!ready(env)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readJson(request); if (error) return error;
  if (isHoneypotTripped(body)) return json({ ok: true });
  try {
    const hash = await ipHash(request, env);
    if ((await rateLimit(env, hash, now)) > RATE_LIMIT_PER_HOUR * 4) return json({ error: 'too many requests' }, 429);
    const pool = await env.DB.prepare('SELECT id, date FROM pools WHERE id = ?').bind(String(body?.pool_id ?? '')).first();
    if (!pool || pool.date < istDate(now)) return json({ error: 'not found' }, 404);
    const v = validateJoin(body); if (!v.ok) return json({ error: v.errors.join(', ') }, 400);
    const n = (await env.DB.prepare('SELECT COUNT(*) AS c FROM pool_options WHERE pool_id = ?').bind(pool.id).first()).c;
    if (v.mask >> n) return json({ error: 'pick at least one show' }, 400);
    // Joining again from the same device only changes your answers, it never adds a second person.
    await env.DB.prepare('INSERT INTO pool_joins (pool_id, ip_hash, area, opts, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (pool_id, ip_hash) DO UPDATE SET area = excluded.area, opts = excluded.opts').bind(pool.id, hash, v.area, v.mask, now.getTime()).run();
    return json({ ok: true });
  } catch (e) { if (missingTable(e)) return json({ error: 'unavailable' }, 503); throw e; }
}

export async function reportPool(request, env, now = new Date()) {
  if (!ready(env)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readJson(request); if (error) return error;
  try {
    const hash = await ipHash(request, env);
    if ((await rateLimit(env, hash, now)) > RATE_LIMIT_PER_HOUR * 4) return json({ error: 'too many requests' }, 429);
    if (!(await env.DB.prepare('SELECT id FROM pools WHERE id = ?').bind(String(body?.pool_id ?? '')).first())) return json({ error: 'not found' }, 404);
    await env.DB.prepare('INSERT OR IGNORE INTO pool_reports (pool_id, ip_hash, created_at) VALUES (?, ?, ?)').bind(String(body.pool_id), hash, now.getTime()).run();
    return json({ ok: true });
  } catch (e) { if (missingTable(e)) return json({ error: 'unavailable' }, 503); throw e; }
}
