// Official meetup RSVP API. Pure handlers: (request, env, now) -> Response.
// Public: an aggregate count only. Submission details stay in the RSVP database, not the public response.
import { json, newId, ipHash, sameOrigin, rateLimit, readJsonCapped, isAdmin } from './api.js';
import { validateRsvp, EVENTS } from '../../src/meet-rsvp.js';
import { RATE_LIMIT_PER_HOUR, isHoneypotTripped } from '../../src/abuse-guard.js';

const JSON_CAP = 4 * 1024;
const ready = (env) => env.DB && (env.HASH_SALT || env.ADMIN_PASSPHRASE);
const DDL = ["CREATE TABLE IF NOT EXISTS meet_rsvp_interest (id TEXT PRIMARY KEY, event TEXT NOT NULL, name TEXT NOT NULL, day TEXT NOT NULL, activities TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'confirmed', created_at INTEGER NOT NULL, ip_hash TEXT NOT NULL)", 'CREATE INDEX IF NOT EXISTS meet_rsvp_interest_event ON meet_rsvp_interest (event, created_at)'];
async function ensure(env) { for (const q of DDL) await env.DB.prepare(q).run(); }
const countOf = async (env, event) => {
  const current = await env.DB.prepare('SELECT COUNT(*) AS c FROM meet_rsvp_interest WHERE event = ?').bind(event).first();
  const old = await env.DB.prepare('SELECT COUNT(*) AS c FROM meet_rsvps WHERE event = ?').bind(event).first().catch(() => ({ c: 0 }));
  return current.c + (old?.c || 0);
};

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
    const before = await countOf(env, r.event);
    const status = before >= r.cap ? 'waitlist' : 'confirmed';
    await env.DB.prepare('INSERT INTO meet_rsvp_interest (id, event, name, day, activities, note, status, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(newId(), r.event, r.rsvp.name, r.rsvp.bring.split('|')[0], r.rsvp.bring.split('|')[1], r.rsvp.note, status, now.getTime(), hash).run();
    const count = await countOf(env, r.event);
    return json({ ok: true, count, spot: count, cap: r.cap, waitlist: status === 'waitlist' });
  } catch (e) { return json({ error: 'unavailable' }, 503); }
}

export async function adminMeetRsvps(request, env, now = new Date()) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  const event = new URL(request.url).searchParams.get('event') || 'meet-1';
  try { await ensure(env); } catch { return json({ rsvps: [] }); }
  const rows = (await env.DB.prepare('SELECT name, day, activities, note, created_at, status FROM meet_rsvp_interest WHERE event = ? ORDER BY created_at').bind(event).all()).results;
  return json({ event, count: rows.length, rsvps: rows.map((x, i) => ({ n: i + 1, name: x.name, day: x.day, activities: x.activities, note: x.note, status: x.status, at: new Date(x.created_at).toISOString() })) });
}
