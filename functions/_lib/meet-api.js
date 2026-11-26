// Official meetup RSVP API. Pure handlers: (request, env, now) -> Response.
// Public: a count only. Private: names and WhatsApp numbers, readable only by the signed-in owner.
import { json, newId, ipHash, sameOrigin, rateLimit, readJsonCapped, isAdmin } from './api.js';
import { validateRsvp, EVENTS } from '../../src/meet-rsvp.js';
import { RATE_LIMIT_PER_HOUR, isHoneypotTripped } from '../../src/abuse-guard.js';

const JSON_CAP = 4 * 1024;
const ready = (env) => env.DB && (env.HASH_SALT || env.ADMIN_PASSPHRASE);
const DDL = ['CREATE TABLE IF NOT EXISTS meet_rsvps (id TEXT PRIMARY KEY, event TEXT NOT NULL, name TEXT NOT NULL, wa TEXT NOT NULL, bring TEXT NOT NULL, created_at INTEGER NOT NULL, ip_hash TEXT NOT NULL, UNIQUE (event, wa))',
  'CREATE INDEX IF NOT EXISTS meet_rsvps_event ON meet_rsvps (event, created_at)'];
// Same schema as migrations/0004_meet_rsvps.sql, created on first use so the page works before the migration is applied.
async function ensure(env) { for (const q of DDL) await env.DB.prepare(q).run(); }
const countOf = async (env, event) => (await env.DB.prepare('SELECT COUNT(*) AS c FROM meet_rsvps WHERE event = ?').bind(event).first()).c;

export async function meetCount(request, env) {
  const event = new URL(request.url).searchParams.get('event') || 'meet-1';
  const ev = EVENTS[event];
  if (!ev) return json({ error: 'not found' }, 404);
  if (!env.DB) return json({ event, cap: ev.cap, count: null });
  try { await ensure(env); return json({ event, cap: ev.cap, count: await countOf(env, event) }); }
  catch { return json({ event, cap: ev.cap, count: null }); }
}

export async function submitMeetRsvp(request, env, now = new Date()) {
  if (!ready(env)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  let body;
  try { body = await readJsonCapped(request, JSON_CAP); } catch (e) { return json({ error: e instanceof RangeError ? 'too large' : 'bad request' }, e instanceof RangeError ? 413 : 400); }
  if (isHoneypotTripped(body)) return json({ ok: true, count: 0, spot: 0 });
  try {
    await ensure(env);
    const hash = await ipHash(request, env);
    const hits = await rateLimit(env, hash, now);
    const r = validateRsvp(body, { now, counters: { ipCountThisHour: hits, totalEntries: 0 } });
    if (!r.store) return r.errors ? json({ error: r.errors.join(', ') }, 400) : json({ error: r.error ?? 'rejected' }, r.status === 200 ? 400 : r.status);
    const dupe = await env.DB.prepare('SELECT created_at FROM meet_rsvps WHERE event = ? AND wa = ?').bind(r.event, r.rsvp.wa).first();
    if (dupe) { const before = (await env.DB.prepare('SELECT COUNT(*) AS c FROM meet_rsvps WHERE event = ? AND created_at <= ?').bind(r.event, dupe.created_at).first()).c; return json({ ok: true, again: true, count: await countOf(env, r.event), spot: before, cap: r.cap }); }
    if ((await countOf(env, r.event)) >= r.cap) return json({ error: 'full', full: true, count: r.cap, cap: r.cap }, 409);
    await env.DB.prepare('INSERT INTO meet_rsvps (id, event, name, wa, bring, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(newId(), r.event, r.rsvp.name, r.rsvp.wa, r.rsvp.bring, now.getTime(), hash).run();
    const count = await countOf(env, r.event);
    return json({ ok: true, count, spot: count, cap: r.cap });
  } catch (e) { return json({ error: 'unavailable' }, 503); }
}

export async function adminMeetRsvps(request, env, now = new Date()) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  const event = new URL(request.url).searchParams.get('event') || 'meet-1';
  try { await ensure(env); } catch { return json({ rsvps: [] }); }
  const rows = (await env.DB.prepare('SELECT name, wa, bring, created_at FROM meet_rsvps WHERE event = ? ORDER BY created_at').bind(event).all()).results;
  return json({ event, count: rows.length, rsvps: rows.map((x, i) => ({ n: i + 1, name: x.name, whatsapp: '+' + x.wa, interest: x.bring, at: new Date(x.created_at).toISOString() })) });
}
