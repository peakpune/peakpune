// Birthday wall API. Pure handlers: (request, env, now) -> Response, wrapped by Cloudflare
// Pages Functions. Same storage and abuse model as plans: D1, approve-before-show, salted
// IP hashes, hourly rate limit. The public list returns only the projected card:
// first name + last initial, day and month, wish and likes, and the age only when the
// person asked for it. Phone, Instagram, birth year and member offers stay in the
// owner's private panel. If the birthdays table is missing the handlers answer 503
// instead of throwing, so a preview without the migration degrades cleanly.
import { json, newId, ipHash, sameOrigin, rateLimit, readJsonCapped, isAdmin } from './api.js';
import { validateBirthday, validateInterest, MIN_FILL_MS } from '../../src/birthday-submission.js';
import { RATE_LIMIT_PER_HOUR, isHoneypotTripped } from '../../src/abuse-guard.js';

const JSON_CAP = 16 * 1024;

async function readJson(request) {
  try { return { body: await readJsonCapped(request, JSON_CAP) }; }
  catch (e) { return { error: json({ error: e instanceof RangeError ? 'too large' : 'bad request' }, e instanceof RangeError ? 413 : 400) }; }
}

// Days from now (IST) until the next occurrence of month/day, and the year it falls in.
function nextOccurrence(month, day, now) {
  const ist = new Date(now.getTime() + 5.5 * 3600e3);
  const y = ist.getUTCFullYear();
  const today = Date.UTC(y, ist.getUTCMonth(), ist.getUTCDate());
  let occ = Date.UTC(y, month - 1, day);
  let occYear = y;
  if (occ < today) { occ = Date.UTC(y + 1, month - 1, day); occYear = y + 1; }
  return { days: Math.round((occ - today) / 86400000), year: occYear };
}

// The only shape the public ever sees.
function publicCard(r, now) {
  const { days, year } = nextOccurrence(r.dob_month, r.dob_day, now);
  return {
    id: r.id,
    name: `${r.first_name} ${r.last_name.charAt(0).toUpperCase()}.`,
    day: r.dob_day,
    month: r.dob_month,
    age: r.show_age ? year - r.dob_year : null,
    wish: r.wish,
    likes: r.likes,
    note: 'Member-posted birthday, approved by the owner. Celebrations are member plans, not organised by Peak Pune.',
    _days: days, // sort key, stripped below
  };
}

export async function submitBirthday(request, env, now = new Date()) {
  if (!env.DB || !(env.HASH_SALT || env.ADMIN_PASSPHRASE)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readJson(request);
  if (error) return error;
  // Bot cases answer with a fake success and write nothing, before any DB work.
  const startedAt = body?.t ? Number(body.t) : undefined;
  if (isHoneypotTripped(body) || (startedAt !== undefined && Number.isFinite(startedAt) && now.getTime() - startedAt < MIN_FILL_MS)) {
    return json({ ok: true, pending: true });
  }
  const hash = await ipHash(request, env);
  let counters;
  try {
    counters = { ipCountThisHour: await rateLimit(env, hash, now), totalEntries: (await env.DB.prepare('SELECT COUNT(*) AS c FROM birthdays').first()).c };
  } catch { return json({ error: 'birthdays are not available yet' }, 503); } // table not migrated yet
  const r = validateBirthday(body, { now, startedAt, counters });
  if (!r.store) {
    if (r.errors) return json({ error: r.errors.join(', ') }, r.status);
    return r.status === 200 ? json({ ok: true, pending: true }) : json({ error: r.error }, r.status);
  }
  const b = r.entry, id = newId();
  await env.DB.prepare('INSERT INTO birthdays (id, first_name, last_name, wa_name, phone, instagram, dob_day, dob_month, dob_year, show_age, wish, likes, call_reason, status, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, b.first_name, b.last_name, b.wa_name, b.phone, b.instagram, b.dob_day, b.dob_month, b.dob_year, b.show_age, b.wish, b.likes, b.call_reason, 'pending', now.getTime(), hash).run();
  return json({ ok: true, pending: true });
}

export async function listBirthdays(request, env, now = new Date()) {
  if (!env.DB) return json({ birthdays: [], accepting: false });
  let rows;
  try {
    rows = (await env.DB.prepare("SELECT id, first_name, last_name, dob_day, dob_month, dob_year, show_age, wish, likes FROM birthdays WHERE status = 'approved' LIMIT 200").all()).results;
  } catch { return json({ error: 'birthdays are not available yet' }, 503); } // table not migrated yet
  const cards = rows.map((r) => publicCard(r, now)).sort((a, b) => a._days - b._days);
  for (const c of cards) delete c._days;
  return json({ birthdays: cards, accepting: true }, 200, { 'cache-control': 'public, max-age=60' });
}

export async function submitInterest(request, env, now = new Date()) {
  if (!env.DB || !(env.HASH_SALT || env.ADMIN_PASSPHRASE)) return json({ error: 'unavailable' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await readJson(request);
  if (error) return error;
  const startedAt = body?.t ? Number(body.t) : undefined;
  if (isHoneypotTripped(body) || (startedAt !== undefined && Number.isFinite(startedAt) && now.getTime() - startedAt < MIN_FILL_MS)) {
    return json({ ok: true });
  }
  const hash = await ipHash(request, env);
  try {
    if ((await rateLimit(env, hash, now)) > RATE_LIMIT_PER_HOUR * 4) return json({ error: 'too many requests' }, 429);
  } catch { return json({ error: 'birthdays are not available yet' }, 503); }
  const r = validateInterest(body, { now, startedAt });
  if (!r.store) {
    if (r.errors) return json({ error: r.errors.join(', ') }, r.status);
    return json({ ok: true });
  }
  let target;
  try { target = await env.DB.prepare("SELECT id FROM birthdays WHERE id = ? AND status = 'approved'").bind(String(body?.birthday_id ?? '')).first(); } catch { return json({ error: 'birthdays are not available yet' }, 503); }
  if (!target) return json({ error: 'not found' }, 404);
  await env.DB.prepare('INSERT OR IGNORE INTO birthday_interest (birthday_id, kind, name, phone, created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(target.id, r.interest.kind, r.interest.name, r.interest.phone, now.getTime(), hash).run();
  return json({ ok: true });
}

// ---- Owner's private panel. Same signed session cookie as plan review. ----

export async function adminListBirthdays(request, env, now = new Date()) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  let rows;
  try {
    rows = (await env.DB.prepare("SELECT * FROM birthdays WHERE status IN ('pending','approved') ORDER BY created_at DESC LIMIT 100").all()).results;
  } catch { return json({ error: 'birthdays are not available yet' }, 503); }
  const ids = rows.map((r) => r.id);
  let offers = [];
  if (ids.length) {
    offers = (await env.DB.prepare(`SELECT birthday_id, kind, name, phone, created_at FROM birthday_interest WHERE birthday_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at`).bind(...ids).all()).results;
  }
  return json({
    birthdays: rows.map((r) => ({
      id: r.id, status: r.status, created_at: r.created_at,
      name: `${r.first_name} ${r.last_name}`, wa_name: r.wa_name, phone: r.phone, instagram: r.instagram,
      dob: `${r.dob_year}-${String(r.dob_month).padStart(2, '0')}-${String(r.dob_day).padStart(2, '0')}`,
      show_age: r.show_age, wish: r.wish, likes: r.likes, call_reason: r.call_reason,
      offers: offers.filter((o) => o.birthday_id === r.id).map((o) => ({ kind: o.kind, name: o.name, phone: o.phone, at: o.created_at })),
    })),
  });
}

export async function adminDecideBirthday(request, env, now = new Date()) {
  if (!(await isAdmin(request, env, now))) return json({ error: 'forbidden' }, 403);
  if (!sameOrigin(request) || !(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'forbidden' }, 403);
  const { id, action } = await request.json().catch(() => ({}));
  const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : '';
  if (!status || !id) return json({ error: 'bad request' }, 400);
  const res = await env.DB.prepare('UPDATE birthdays SET status = ? WHERE id = ?').bind(status, String(id)).run();
  return json({ ok: true, changed: res.meta?.changes ?? res.changes ?? 0 });
}
