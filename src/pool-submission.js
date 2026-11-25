// Validator for "Watch together" pools. Pure function, no storage or network.
// A pool is a film, one date, 1 to 3 candidate shows (cinema + time), a target headcount
// and an optional District link. No contact details are accepted anywhere.
import { screenSubmission } from './abuse-guard.js';

export const AREAS = ['Aundh', 'Baner', 'Camp', 'Deccan', 'Hadapsar', 'Hinjewadi', 'Kalyani Nagar', 'Kharadi', 'Katraj', 'Karve Nagar', 'Koregaon Park', 'Kothrud', 'Magarpatta', 'Pimpri-Chinchwad', 'Shivajinagar', 'Viman Nagar', 'Wakad', 'Other'];
export const LIMITS = { film: 60, cinema: 60 };
export const TARGET_MIN = 2, TARGET_MAX = 12, MAX_OPTIONS = 3, MAX_DAYS_AHEAD = 21;
export const MIN_FILL_MS = 3000;
export const DISTRICT_PREFIX = 'https://www.district.in/movies/';
export const DISTRICT_PUNE = 'https://www.district.in/movies/pune-movie-tickets';

const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const hasContact = (s) => /\d[\d\s().-]{8,}\d/.test(s) || /\S+@\S+\.\S+/.test(s) || /(^|\s)@\w/.test(s);
export const istDate = (now) => new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
export const istTime = (now) => new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(11, 16);

export function validatePool(body, { now = new Date(), counters } = {}) {
  const screen = screenSubmission(body, counters ?? { ipCountThisHour: 0, totalEntries: 0 });
  if (!screen.store) return { ok: screen.ok, store: false, status: screen.status, error: screen.error };
  const errors = [];
  const film = clean(body?.film), date = clean(body?.date), area = clean(body?.area);
  const target = Number(body?.target);
  if (!film) errors.push('film required'); else if (film.length > LIMITS.film) errors.push('film too long'); else if (hasContact(film)) errors.push('film must not contain contact details');
  if (!AREAS.includes(area)) errors.push('area invalid');
  if (!Number.isInteger(target) || target < TARGET_MIN || target > TARGET_MAX) errors.push(`group size must be ${TARGET_MIN} to ${TARGET_MAX}`);
  const today = istDate(now);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date + 'T00:00:00+05:30').getTime())) errors.push('date invalid');
  else if (date < today) errors.push('date is in the past');
  else if ((new Date(date + 'T00:00:00Z') - new Date(today + 'T00:00:00Z')) / 86400000 > MAX_DAYS_AHEAD) errors.push(`date is more than ${MAX_DAYS_AHEAD} days away`);
  const raw = Array.isArray(body?.options) ? body.options : [];
  const options = [];
  if (raw.length < 1 || raw.length > MAX_OPTIONS) errors.push(`add 1 to ${MAX_OPTIONS} shows`);
  for (const o of raw.slice(0, MAX_OPTIONS)) {
    const cinema = clean(o?.cinema), time = clean(o?.time);
    if (!cinema || cinema.length > LIMITS.cinema) errors.push('cinema required, 60 characters at most');
    else if (hasContact(cinema)) errors.push('cinema must not contain contact details');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) errors.push('time invalid');
    else if (date === today && time <= istTime(now)) errors.push('a show time has already passed today');
    options.push({ cinema, time });
  }
  const keys = options.map((o) => o.cinema.toLowerCase() + '|' + o.time);
  if (new Set(keys).size !== keys.length) errors.push('duplicate show');
  let link = clean(body?.link);
  if (link && !(link.startsWith(DISTRICT_PREFIX) && link.length <= 300 && !/[\s"'<>]/.test(link))) errors.push('link must be a District movie page');
  if (errors.length) return { ok: false, store: false, status: 400, errors };
  return { ok: true, store: true, status: 200, pool: { film, date, area, target, options, link } };
}

export function validateJoin(body) {
  const area = clean(body?.area);
  const ids = Array.isArray(body?.options) ? body.options.map(Number) : [];
  const errors = [];
  if (!AREAS.includes(area)) errors.push('area invalid');
  if (!ids.length || ids.some((n) => !Number.isInteger(n) || n < 0 || n >= MAX_OPTIONS)) errors.push('pick at least one show');
  if (errors.length) return { ok: false, errors };
  return { ok: true, area, mask: [...new Set(ids)].reduce((m, i) => m | (1 << i), 0) };
}
