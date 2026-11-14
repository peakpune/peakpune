// Plan posting API. Pure handlers: (request, env, now) -> Response. Cloudflare Pages Functions wrap them.
// env.DB = D1 (plans, and sanitized images as blobs, so no R2 and no extra cost), env.ADMIN_PASSPHRASE (a Cloudflare secret; the owner's login).
// No personal contact is collected. IPs are stored only as salted hashes.
import { validatePlan } from '../../src/plan-submission.js';
import { checkLimits, RATE_LIMIT_PER_HOUR } from '../../src/abuse-guard.js';
import { sanitizeImage } from '../../src/image-sanitize.js';

export const IMAGE_MAX_BYTES = 1024 * 1024; // D1 rows are capped at 2 MB
const MAX_BODY = IMAGE_MAX_BYTES + 64 * 1024;
const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const todayIST = (now) => new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const newId = () => hex(crypto.getRandomValues(new Uint8Array(9)));

async function ipHash(request, env) {
  const salt = env.HASH_SALT || (await hmac(env.ADMIN_PASSPHRASE, 'ip-salt'));
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + '|' + ip))).slice(0, 32);
}
const sameOrigin = (request) => { const o = request.headers.get('origin'); return !o || o === new URL(request.url).origin; };

// Count this request against the hourly limit. Returns the limit decision.
async function rateLimit(env, hash, now) {
  const hour = Math.floor(now.getTime() / 3600e3);
  await env.DB.prepare('INSERT INTO rate (ip_hash, hour, n) VALUES (?, ?, 1) ON CONFLICT (ip_hash, hour) DO UPDATE SET n = n + 1').bind(hash, hour).run();
  const row = await env.DB.prepare('SELECT n FROM rate WHERE ip_hash = ? AND hour = ?').bind(hash, hour).first();
  await env.DB.prepare('DELETE FROM rate WHERE hour < ?').bind(hour - 2).run();
  return row.n;
}
const total = async (env) => (await env.DB.prepare('SELECT COUNT(*) AS c FROM plans').first()).c;

export function goingLabel(n) {
  if (n < 1) return '';
  if (n < 5) return 'A few going';
  return `${Math.floor(n / 5) * 5}+ going`;
}

async function readBody(request) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > MAX_BODY) return { error: json({ error: 'too large' }, 413) };
  const type = request.headers.get('content-type') || '';
  try {
    if (type.startsWith('multipart/form-data')) {
      const fd = await request.formData();
      const body = {}; let file = null;
      for (const [k, v] of fd.entries()) { if (typeof v === 'string') body[k] = v; else if (k === 'image' && v.size > 0) file = v; }
      return { body, file };
    }
    if (type.startsWith('application/json')) return { body: await request.json(), file: null };
  } catch { /* fall through */ }
  return { error: json({ error: 'bad request' }, 400) };
}

export async function submitPlan(request, env, now = new Date()) {
  if (!env.DB || !(env.HASH_SALT || env.ADMIN_PASSPHRASE)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, file, error } = await readBody(request);
  if (error) return error;
  const hash = await ipHash(request, env);
  const counters = { ipCountThisHour: await rateLimit(env, hash, now), totalEntries: await total(env) };
  const r = validatePlan(body, { now, startedAt: body?.t ? Number(body.t) : undefined, counters });
  if (!r.store) {
    if (r.errors) return json({ error: r.errors.join(', ') }, r.status);
    return r.status === 200 ? json({ ok: true, pending: true }) : json({ error: r.error }, r.status); // honeypot / too fast: fake success, nothing stored
  }
  const p = r.plan, id = newId();
  let image = null;
  if (file) {
    if (file.size > IMAGE_MAX_BYTES) return json({ error: 'image too large (max 1 MB)' }, 400);
    const clean = sanitizeImage(new Uint8Array(await file.arrayBuffer()));
    if (!clean.ok) return json({ error: 'image rejected: ' + clean.reason }, 400);
    image = clean;
  }
  await env.DB.prepare('INSERT INTO plans (id, title, date, time, area, venue, link, image_key, status, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, p.title, p.date, p.time, p.area, p.venue, p.link, image ? image.type : '', 'pending', now.getTime(), hash).run();
  if (image) await env.DB.prepare('INSERT INTO images (plan_id, type, bytes) VALUES (?, ?, ?)').bind(id, image.type, image.bytes).run();
  return json({ ok: true, pending: true });
}

export async function listPlans(request, env, now = new Date()) {
  if (!env.DB) return json({ plans: [] });
  const rows = (await env.DB.prepare("SELECT p.id, p.title, p.date, p.time, p.area, p.venue, p.link, p.image_key, (SELECT COUNT(*) FROM going g WHERE g.plan_id = p.id) AS g FROM plans p WHERE p.status = 'approved' AND p.date >= ? ORDER BY p.date, p.time LIMIT 100").bind(todayIST(now)).all()).results;
  return json({ plans: rows.map((x) => ({ id: x.id, title: x.title, date: x.date, time: x.time, area: x.area, venue: x.venue, link: x.link, image: x.image_key ? `/api/image/${x.id}` : '', going: goingLabel(x.g), note: 'Community-posted, not organiser-confirmed' })) }, 200, { 'cache-control': 'public, max-age=60' });
}

async function approvedPlan(env, id) { return env.DB.prepare("SELECT id FROM plans WHERE id = ? AND status = 'approved'").bind(String(id ?? '')).first(); }

export async function markGoing(request, env, now = new Date()) {
  if (!env.DB || !(env.HASH_SALT || env.ADMIN_PASSPHRASE)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readBody(request); if (error) return error;
  const hash = await ipHash(request, env);
  if ((await rateLimit(env, hash, now)) > RATE_LIMIT_PER_HOUR * 4) return json({ error: 'too many requests' }, 429);
  if (!(await approvedPlan(env, body?.plan_id))) return json({ error: 'not found' }, 404);
  await env.DB.prepare('INSERT OR IGNORE INTO going (plan_id, ip_hash, created_at) VALUES (?, ?, ?)').bind(String(body.plan_id), hash, now.getTime()).run();
  const n = (await env.DB.prepare('SELECT COUNT(*) AS c FROM going WHERE plan_id = ?').bind(String(body.plan_id)).first()).c;
  return json({ ok: true, going: goingLabel(n) });
}

export async function reportPlan(request, env, now = new Date()) {
  if (!env.DB || !(env.HASH_SALT || env.ADMIN_PASSPHRASE)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readBody(request); if (error) return error;
  const hash = await ipHash(request, env);
  if ((await rateLimit(env, hash, now)) > RATE_LIMIT_PER_HOUR * 4) return json({ error: 'too many requests' }, 429);
  if (!(await approvedPlan(env, body?.plan_id))) return json({ error: 'not found' }, 404);
  await env.DB.prepare('INSERT OR IGNORE INTO reports (plan_id, ip_hash, created_at) VALUES (?, ?, ?)').bind(String(body.plan_id), hash, now.getTime()).run();
  return json({ ok: true });
}

async function imageResponse(env, sql, id, cache) {
  const row = await env.DB.prepare(sql).bind(String(id)).first();
  if (!row) return new Response('not found', { status: 404 });
  return new Response(new Uint8Array(row.bytes), { headers: { 'content-type': 'image/' + row.type, 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'", 'cache-control': cache } });
}
export async function publicImage(request, env, id) {
  if (!env.DB) return new Response('not found', { status: 404 });
  return imageResponse(env, "SELECT i.bytes, i.type FROM images i JOIN plans p ON p.id = i.plan_id WHERE p.id = ? AND p.status = 'approved'", id, 'public, max-age=3600');
}

// ---- Admin. Fails closed unless ADMIN_PASSPHRASE is set and the request carries a valid signed session cookie. ----
// Owner login: one passphrase held as the Cloudflare secret ADMIN_PASSPHRASE. A correct login sets a signed, HttpOnly session cookie.
// The cookie key and the IP-hash salt are derived from that secret, so there is nothing else to configure.
const enc = new TextEncoder();
async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}
const same = (a, b) => { let d = a.length ^ b.length; for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0); return d === 0; };
const SESSION_SECONDS = 8 * 3600;
const cookieOf = (request, name) => (request.headers.get('cookie') || '').split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === name)?.[1] || '';

export async function isAdmin(request, env, now = new Date()) {
  if (!env.ADMIN_PASSPHRASE) return false;
  const [exp, sig] = cookieOf(request, 'pp_admin').split('.');
  if (!exp || !sig || !(Number(exp) * 1000 > now.getTime())) return false;
  return same(sig, await hmac(env.ADMIN_PASSPHRASE, 'session|' + exp));
}
export async function adminLogin(request, env, now = new Date()) {
  if (!env.DB || !env.ADMIN_PASSPHRASE) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request) || !(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'forbidden' }, 403);
  if ((await rateLimit(env, 'login|' + (await ipHash(request, env)), now)) > 8) return json({ error: 'too many attempts' }, 429);
  const { passphrase } = await request.json().catch(() => ({}));
  if (typeof passphrase !== 'string' || !same(await hmac(env.ADMIN_PASSPHRASE, 'check|' + passphrase), await hmac(env.ADMIN_PASSPHRASE, 'check|' + env.ADMIN_PASSPHRASE))) return json({ error: 'wrong passphrase' }, 401);
  const exp = Math.floor(now.getTime() / 1000) + SESSION_SECONDS;
  const cookie = `pp_admin=${exp}.${await hmac(env.ADMIN_PASSPHRASE, 'session|' + exp)}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  return json({ ok: true }, 200, { 'set-cookie': cookie });
}

export async function adminList(request, env, now) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  const rows = (await env.DB.prepare("SELECT p.id, p.title, p.date, p.time, p.area, p.venue, p.link, p.image_key, p.status, (SELECT COUNT(*) FROM reports r WHERE r.plan_id = p.id) AS reports FROM plans p WHERE p.status = 'pending' OR (p.status = 'approved' AND (SELECT COUNT(*) FROM reports r WHERE r.plan_id = p.id) > 0) ORDER BY p.created_at DESC LIMIT 100").all()).results;
  return json({ plans: rows.map((x) => ({ ...x, image: x.image_key ? `/api/admin/image?id=${x.id}` : '' })) });
}
export async function adminDecide(request, env, now) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  if (!sameOrigin(request) || !(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'forbidden' }, 403);
  const { id, action } = await request.json().catch(() => ({}));
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : '';
  if (!status || !id) return json({ error: 'bad request' }, 400);
  const res = await env.DB.prepare('UPDATE plans SET status = ? WHERE id = ?').bind(status, String(id)).run();
  if (status === 'approved') await env.DB.prepare('DELETE FROM reports WHERE plan_id = ?').bind(String(id)).run();
  return json({ ok: true, changed: res.meta?.changes ?? res.changes ?? 0 });
}
export async function adminImage(request, env, now) {
  if (!(await isAdmin(request, env, now))) return new Response('forbidden', { status: 403 });
  return imageResponse(env, 'SELECT bytes, type FROM images WHERE plan_id = ?', new URL(request.url).searchParams.get('id'), 'no-store');
}
