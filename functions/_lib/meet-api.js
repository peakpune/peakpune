// Official meetup RSVP API. Public responses expose an aggregate count only.
import { json, newId, ipHash, sameOrigin, rateLimit, readJsonCapped, isAdmin } from './api.js';
import { validateRsvp, EVENTS } from '../../src/meet-rsvp.js';
import { isHoneypotTripped } from '../../src/abuse-guard.js';

const JSON_CAP = 4 * 1024;
const ready = (env) => env.DB && (env.HASH_SALT || env.ADMIN_PASSPHRASE);
const DDL = [
  'CREATE TABLE IF NOT EXISTS meet_rsvp_interest (id TEXT PRIMARY KEY, event TEXT NOT NULL, name TEXT NOT NULL, day TEXT NOT NULL, activities TEXT NOT NULL, note TEXT NOT NULL DEFAULT \'\', status TEXT NOT NULL DEFAULT \'confirmed\', created_at INTEGER NOT NULL, ip_hash TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS meet_rsvp_interest_event ON meet_rsvp_interest (event, created_at)',
  'CREATE TABLE IF NOT EXISTS meet_rsvp_admin_meta (event TEXT NOT NULL, source TEXT NOT NULL, rsvp_id TEXT NOT NULL, contacted_at INTEGER, PRIMARY KEY (event, source, rsvp_id))',
];
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
  } catch { return json({ error: 'unavailable' }, 503); }
}

export async function adminMeetRsvps(request, env, now = new Date()) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  const event = new URL(request.url).searchParams.get('event') || 'meet-1';
  if (!EVENTS[event] || !env.DB) return json({ error: 'unavailable' }, 503);
  try {
    await ensure(env);
    const current = await env.DB.prepare('SELECT id, name, day, activities, note, created_at, status FROM meet_rsvp_interest WHERE event = ? ORDER BY created_at DESC').bind(event).all();
    const legacy = await env.DB.prepare('SELECT id, name, bring, created_at, status FROM meet_rsvps WHERE event = ? ORDER BY created_at DESC').bind(event).all().catch(() => ({ results: [] }));
    const rows = [
      ...(current.results || []).map((r) => ({ id: r.id, source: 'interest', name: r.name, day: r.day, activities: r.activities, note: r.note || '', created_at: r.created_at, status: r.status })),
      ...(legacy.results || []).map((r) => {
        const [day = 'any', activities = ''] = String(r.bring || '').split('|', 2);
        return { id: r.id, source: 'legacy', name: r.name, day, activities, note: '', created_at: r.created_at, status: r.status };
      }),
    ].sort((a, b) => b.created_at - a.created_at);
    const marked = await env.DB.prepare('SELECT source, rsvp_id, contacted_at FROM meet_rsvp_admin_meta WHERE event = ? AND contacted_at IS NOT NULL').bind(event).all();
    const contacted = new Map((marked.results || []).map((r) => [`${r.source}:${r.rsvp_id}`, r.contacted_at]));
    return json({ event, count: rows.length, confirmed: rows.filter((r) => r.status === 'confirmed').length, waitlist: rows.filter((r) => r.status === 'waitlist').length,
      rsvps: rows.map((r) => ({ id: r.id, source: r.source, name: r.name, day: r.day, activities: r.activities, note: r.note, status: r.status, contactedAt: contacted.get(`${r.source}:${r.id}`) || null, at: new Date(r.created_at).toISOString() })) });
  } catch { return json({ error: 'unavailable' }, 503); }
}

const strictOrigin = (request) => request.headers.get('origin') === new URL(request.url).origin;
async function readAdminBody(request) {
  if (!strictOrigin(request) || !(request.headers.get('content-type') || '').startsWith('application/json')) return null;
  try { return await readJsonCapped(request, 1024); } catch { return null; }
}
export async function updateMeetRsvpAdmin(request, env, now = new Date()) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  const body = await readAdminBody(request);
  const event = String(body?.event || 'meet-1'), id = String(body?.id || ''), source = String(body?.source || '');
  if (!body || !EVENTS[event] || !id || !['interest', 'legacy'].includes(source) || !['contacted', 'delete'].includes(body.action)) return json({ error: 'bad request' }, 400);
  try {
    await ensure(env);
    if (body.action === 'contacted') {
      const table = source === 'interest' ? 'meet_rsvp_interest' : 'meet_rsvps';
      const exists = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ? AND event = ?`).bind(id, event).first().catch(() => null);
      if (!exists) return json({ error: 'not found' }, 404);
      await env.DB.prepare('INSERT INTO meet_rsvp_admin_meta (event, source, rsvp_id, contacted_at) VALUES (?, ?, ?, ?) ON CONFLICT (event, source, rsvp_id) DO UPDATE SET contacted_at = excluded.contacted_at').bind(event, source, id, now.getTime()).run();
      return json({ ok: true, contactedAt: now.toISOString() });
    }
    const table = source === 'interest' ? 'meet_rsvp_interest' : 'meet_rsvps';
    const result = await env.DB.prepare(`DELETE FROM ${table} WHERE id = ? AND event = ?`).bind(id, event).run();
    await env.DB.prepare('DELETE FROM meet_rsvp_admin_meta WHERE event = ? AND source = ? AND rsvp_id = ?').bind(event, source, id).run();
    if (!(result.meta?.changes ?? result.changes ?? 0)) return json({ error: 'not found' }, 404);
    return json({ ok: true, count: await countOf(env, event) });
  } catch { return json({ error: 'unavailable' }, 503); }
}
