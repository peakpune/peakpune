// Validator for birthday-wall submissions and private member offers. Approve-before-show,
// same as plans. Unlike plans, phone, Instagram and full date of birth are collected on
// purpose: they go only to the owner's private review panel, never to the public wall.
// Pure functions, no storage or network.
import { screenSubmission } from './abuse-guard.js';

export const BIRTHDAY_LIMITS = { first_name: 40, last_name: 40, wa_name: 60, phone: 20, instagram: 31, wish: 200, likes: 200, call_reason: 200 };
export const INTEREST_KINDS = ['plan', 'host', 'join'];
export const MIN_FILL_MS = 3000;

const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const PHONE = /^\+?[0-9][0-9\s-]{7,18}$/;
const INSTA = /^@?[A-Za-z0-9][A-Za-z0-9._]{0,29}$/;
const istYear = (now) => new Date(now.getTime() + 5.5 * 3600e3).getUTCFullYear();

export function validateBirthday(body, { now = new Date(), startedAt, counters } = {}) {
  const screen = screenSubmission(body, counters ?? { ipCountThisHour: 0, totalEntries: 0 });
  if (!screen.store) return { ok: screen.ok, store: false, status: screen.status, error: screen.error };
  if (startedAt !== undefined && now.getTime() - startedAt < MIN_FILL_MS) return { ok: true, store: false, status: 200 };
  const entry = {};
  const errors = [];
  for (const f of Object.keys(BIRTHDAY_LIMITS)) entry[f] = clean(body?.[f]);
  for (const [f, max] of Object.entries(BIRTHDAY_LIMITS)) if (entry[f].length > max) errors.push(`${f} too long`);
  for (const f of ['first_name', 'last_name', 'wa_name', 'phone', 'instagram', 'wish', 'likes']) if (!entry[f]) errors.push(`${f} required`);
  if (entry.phone && !PHONE.test(entry.phone)) errors.push('phone number looks wrong');
  if (entry.instagram && !INSTA.test(entry.instagram)) errors.push('instagram handle looks wrong');
  const day = Number(body?.dob_day), month = Number(body?.dob_month), year = Number(body?.dob_year);
  const thisYear = istYear(now);
  if (!Number.isInteger(day) || day < 1 || day > 31) errors.push('birth day invalid');
  if (!Number.isInteger(month) || month < 1 || month > 12) errors.push('birth month invalid');
  if (!Number.isInteger(year) || year < thisYear - 100 || year > thisYear - 5) errors.push('birth year invalid');
  if (!errors.some((e) => e.includes('birth'))) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) errors.push('date of birth invalid');
  }
  if (errors.length) return { ok: false, store: false, status: 400, errors };
  entry.dob_day = day;
  entry.dob_month = month;
  entry.dob_year = year;
  entry.show_age = body?.show_age === true || body?.show_age === 'on' || body?.show_age === '1' || body?.show_age === 1 ? 1 : 0;
  return { ok: true, store: true, status: 200, entry: { ...entry, status: 'pending' } };
}

// A member's private offer on a card: plan it, host it or join it. Name and phone go only
// to the owner, who connects people on WhatsApp. Nothing is published or counted publicly.
export function validateInterest(body, { now = new Date(), startedAt } = {}) {
  const screen = screenSubmission(body, { ipCountThisHour: 0, totalEntries: 0 });
  if (!screen.store) return { ok: screen.ok, store: false, status: screen.status, error: screen.error };
  if (startedAt !== undefined && now.getTime() - startedAt < MIN_FILL_MS) return { ok: true, store: false, status: 200 };
  const kind = clean(body?.kind);
  const name = clean(body?.name);
  const phone = clean(body?.phone);
  const errors = [];
  if (!INTEREST_KINDS.includes(kind)) errors.push('kind invalid');
  if (!name || name.length > 80) errors.push('name required');
  if (!PHONE.test(phone)) errors.push('phone number looks wrong');
  if (errors.length) return { ok: false, store: false, status: 400, errors };
  return { ok: true, store: true, status: 200, interest: { kind, name, phone } };
}
