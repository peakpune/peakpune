// Validator for official meetup RSVPs. Pure function, no storage or network.
// Interest list: first name, preferred day, activity choices and optional note.
import { screenSubmission } from './abuse-guard.js';

export const EVENTS = { 'meet-1': { cap: 12, title: 'Peak Pune Meet 1 interest list (date, place and plan TBC)', closes: '2027-01-01T00:00:00+05:30' } };
export const DAYS = ['sat', 'sun', 'weekday', 'any'];
export const ENJOY = ['mall', 'movie', 'laser', 'paintball', 'games', 'walk', 'cafe', 'streetfood', 'bowling', 'arcade'];
export const MIN_FILL_MS = 2000;
const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

export function validateRsvp(body, { counters, now = new Date() } = {}) {
  const screen = screenSubmission(body, counters ?? { ipCountThisHour: 0, totalEntries: 0 });
  if (!screen.store) return { ok: screen.ok, store: false, status: screen.status, error: screen.error };
  const errors = [];
  const event = clean(body?.event) || 'meet-1';
  const ev = EVENTS[event];
  if (!ev) return { ok: false, store: false, status: 404, error: 'unknown event' };
  if (now > new Date(ev.closes)) return { ok: false, store: false, status: 410, error: 'the interest list is closed' };
  const name = clean(body?.name).split(' ')[0];
  const enjoy = Array.isArray(body?.enjoy) ? [...new Set(body.enjoy.map((x) => clean(x)))].filter(Boolean) : [clean(body?.enjoy) || 'mall'];
  const note = clean(body?.note).slice(0, 240);
  const day = clean(body?.day) || 'any';
  if (!name) errors.push('name required'); else if (name.length > 40) errors.push('name too long'); else if (/\d|@|https?:/i.test(name)) errors.push('first name only');
  if (!DAYS.includes(day)) errors.push('day invalid');
  if (!enjoy.length || enjoy.some((x) => !ENJOY.includes(x))) errors.push('enjoy invalid');
  if (errors.length) return { ok: false, store: false, status: 400, errors };
  return { ok: true, store: true, status: 200, event, cap: ev.cap, rsvp: { name, bring: day + '|' + enjoy.join(','), note } };
}
