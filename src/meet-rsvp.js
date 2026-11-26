// Validator for official meetup RSVPs. Pure function, no storage or network.
// Interest list: a first name, a WhatsApp number, a preferred day and what they would enjoy. Nothing else.
import { screenSubmission } from './abuse-guard.js';

export const EVENTS = { 'meet-1': { cap: 10, title: 'Peak Pune Meet 1 interest list (date, place and plan TBC)', closes: '2027-01-01T00:00:00+05:30' } };
export const DAYS = ['sat', 'sun', 'weekday', 'any'];
export const ENJOY = ['mall', 'movie', 'laser', 'paintball', 'games', 'picnic', 'walk'];
export const MIN_FILL_MS = 2000;
const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

// Keep digits only. 10 digits is an Indian mobile (stored as 91XXXXXXXXXX); 11 to 15 digits is kept as given.
export function normalizeWhatsApp(raw) {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 10) return '91' + d;
  if (d.length === 11 && d.startsWith('0')) return '91' + d.slice(1);
  return d.length >= 11 && d.length <= 15 ? d : '';
}

export function validateRsvp(body, { counters, now = new Date() } = {}) {
  const screen = screenSubmission(body, counters ?? { ipCountThisHour: 0, totalEntries: 0 });
  if (!screen.store) return { ok: screen.ok, store: false, status: screen.status, error: screen.error };
  const errors = [];
  const event = clean(body?.event) || 'meet-1';
  const ev = EVENTS[event];
  if (!ev) return { ok: false, store: false, status: 404, error: 'unknown event' };
  if (now > new Date(ev.closes)) return { ok: false, store: false, status: 410, error: 'the interest list is closed' };
  const name = clean(body?.name).split(' ')[0];
  const wa = normalizeWhatsApp(body?.wa);
  const day = clean(body?.day) || 'any';
  const enjoy = clean(body?.enjoy) || 'mall';
  if (!name) errors.push('name required'); else if (name.length > 40) errors.push('name too long'); else if (/\d|@|https?:/i.test(name)) errors.push('first name only');
  if (!wa) errors.push('whatsapp number invalid');
  if (!DAYS.includes(day)) errors.push('day invalid');
  if (!ENJOY.includes(enjoy)) errors.push('enjoy invalid');
  if (errors.length) return { ok: false, store: false, status: 400, errors };
  return { ok: true, store: true, status: 200, event, cap: ev.cap, rsvp: { name, wa, bring: day + '|' + enjoy } };
}
