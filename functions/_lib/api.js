// Plan posting API. Pure handlers: (request, env, now) -> Response. Cloudflare Pages Functions wrap them.
// env.DB = D1, env.IMAGES = R2 (optional), env.HASH_SALT, env.ADMIN_EMAIL, env.ACCESS_TEAM_DOMAIN, env.ACCESS_AUD.
// No personal contact is collected. IPs are stored only as salted hashes.
import { validatePlan } from '../../src/plan-submission.js';
import { checkLimits, RATE_LIMIT_PER_HOUR } from '../../src/abuse-guard.js';
import { sanitizeImage, MAX_BYTES } from '../../src/image-sanitize.js';

const MAX_BODY = MAX_BYTES + 64 * 1024;
const REPORTS_TO_HIDE = 3;
const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const todayIST = (now) => new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const newId = () => hex(crypto.getRandomValues(new Uint8Array(9)));

async function ipHash(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.HASH_SALT + '|' + ip))).slice(0, 32);
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
  if (!env.DB || !env.HASH_SALT) return json({ error: 'unavailable' }, 503);
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
  let image_key = '';
  if (file) {
    if (!env.IMAGES) return json({ error: 'images are not enabled yet' }, 400);
    const clean = sanitizeImage(new Uint8Array(await file.arrayBuffer()));
    if (!clean.ok) return json({ error: 'image rejected: ' + clean.reason }, 400);
    const id = newId();
    image_key = `${id}.${clean.type === 'jpeg' ? 'jpg' : clean.type}`;
    await env.IMAGES.put(image_key, clean.bytes, { httpMetadata: { contentType: 'image/' + clean.type } });
  }
  const p = r.plan;
  await env.DB.prepare('INSERT INTO plans (id, title, date, time, area, venue, link, image_key, status, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(newId(), p.title, p.date, p.time, p.area, p.venue, p.link, image_key, 'pending', now.getTime(), hash).run();
  return json({ ok: true, pending: true });
}

export async function listPlans(request, env, now = new Date()) {
  if (!env.DB) return json({ plans: [] });
  const rows = (await env.DB.prepare("SELECT p.id, p.title, p.date, p.time, p.area, p.venue, p.link, p.image_key, (SELECT COUNT(*) FROM going g WHERE g.plan_id = p.id) AS g FROM plans p WHERE p.status = 'approved' AND p.date >= ? AND (SELECT COUNT(*) FROM reports r WHERE r.plan_id = p.id) < ? ORDER BY p.date, p.time LIMIT 100").bind(todayIST(now), REPORTS_TO_HIDE).all()).results;
  return json({ plans: rows.map((x) => ({ id: x.id, title: x.title, date: x.date, time: x.time, area: x.area, venue: x.venue, link: x.link, image: x.image_key ? `/api/image/${x.id}` : '', going: goingLabel(x.g), note: 'Community-posted, not organiser-confirmed' })) }, 200, { 'cache-control': 'public, max-age=60' });
}

async function approvedPlan(env, id) { return env.DB.prepare("SELECT id FROM plans WHERE id = ? AND status = 'approved'").bind(String(id ?? '')).first(); }

export async function markGoing(request, env, now = new Date()) {
  if (!env.DB || !env.HASH_SALT) return json({ error: 'unavailable' }, 503);
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
  if (!env.DB || !env.HASH_SALT) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readBody(request); if (error) return error;
  const hash = await ipHash(request, env);
  if ((await rateLimit(env, hash, now)) > RATE_LIMIT_PER_HOUR * 4) return json({ error: 'too many requests' }, 429);
  if (!(await approvedPlan(env, body?.plan_id))) return json({ error: 'not found' }, 404);
  await env.DB.prepare('INSERT OR IGNORE INTO reports (plan_id, ip_hash, created_at) VALUES (?, ?, ?)').bind(String(body.plan_id), hash, now.getTime()).run();
  return json({ ok: true });
}

export async function publicImage(request, env, id) {
  if (!env.DB || !env.IMAGES) return new Response('not found', { status: 404 });
  const row = await env.DB.prepare("SELECT image_key FROM plans WHERE id = ? AND status = 'approved' AND image_key != ''").bind(String(id)).first();
  if (!row) return new Response('not found', { status: 404 });
  const obj = await env.IMAGES.get(row.image_key);
  if (!obj) return new Response('not found', { status: 404 });
  return new Response(obj.body ?? obj.bytes, { headers: { 'content-type': obj.httpMetadata?.contentType || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'", 'cache-control': 'public, max-age=3600' } });
}

// ---- Admin (behind Cloudflare Access). Fails closed unless a valid Access JWT for ADMIN_EMAIL is present. ----
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
export async function isAdmin(request, env, now = new Date(), fetchKeys = defaultKeys) {
  if (!env.ADMIN_EMAIL || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  const jwt = request.headers.get('cf-access-jwt-assertion');
  if (!jwt) return false;
  try {
    const [h, p, s] = jwt.split('.');
    const header = JSON.parse(new TextDecoder().decode(b64u(h))), claims = JSON.parse(new TextDecoder().decode(b64u(p)));
    if (header.alg !== 'RS256') return false;
    const jwk = (await fetchKeys(env)).find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(h + '.' + p)))) return false;
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    return aud.includes(env.ACCESS_AUD) && claims.iss === `https://${env.ACCESS_TEAM_DOMAIN}` && claims.exp * 1000 > now.getTime() && String(claims.email).toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  } catch { return false; }
}
async function defaultKeys(env) { return (await (await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`)).json()).keys; }

export async function adminList(request, env, now, fetchKeys) {
  if (!(await isAdmin(request, env, now, fetchKeys))) return json({ error: 'forbidden' }, 403);
  const rows = (await env.DB.prepare("SELECT p.id, p.title, p.date, p.time, p.area, p.venue, p.link, p.image_key, p.status, (SELECT COUNT(*) FROM reports r WHERE r.plan_id = p.id) AS reports FROM plans p WHERE p.status = 'pending' OR (p.status = 'approved' AND (SELECT COUNT(*) FROM reports r WHERE r.plan_id = p.id) > 0) ORDER BY p.created_at DESC LIMIT 100").all()).results;
  return json({ plans: rows.map((x) => ({ ...x, image: x.image_key ? `/api/admin/image?id=${x.id}` : '' })) });
}
export async function adminDecide(request, env, now, fetchKeys) {
  if (!(await isAdmin(request, env, now, fetchKeys))) return json({ error: 'forbidden' }, 403);
  if (!sameOrigin(request) || !(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'forbidden' }, 403);
  const { id, action } = await request.json().catch(() => ({}));
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : '';
  if (!status || !id) return json({ error: 'bad request' }, 400);
  const res = await env.DB.prepare('UPDATE plans SET status = ? WHERE id = ?').bind(status, String(id)).run();
  if (status === 'approved') await env.DB.prepare('DELETE FROM reports WHERE plan_id = ?').bind(String(id)).run();
  return json({ ok: true, changed: res.meta?.changes ?? res.changes ?? 0 });
}
export async function adminImage(request, env, now, fetchKeys) {
  if (!(await isAdmin(request, env, now, fetchKeys))) return new Response('forbidden', { status: 403 });
  const id = new URL(request.url).searchParams.get('id');
  const row = await env.DB.prepare("SELECT image_key FROM plans WHERE id = ? AND image_key != ''").bind(String(id)).first();
  const obj = row && env.IMAGES ? await env.IMAGES.get(row.image_key) : null;
  if (!obj) return new Response('not found', { status: 404 });
  return new Response(obj.body ?? obj.bytes, { headers: { 'content-type': obj.httpMetadata?.contentType || 'application/octet-stream', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'", 'cache-control': 'no-store' } });
}
