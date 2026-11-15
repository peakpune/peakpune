// Provisional validator for visitor-submitted plans. Dormant: imported by no page or script.
// Assumes approve-before-show. Collects no personal contact. Pure function, no storage or network.
import { screenSubmission } from './abuse-guard.js';

export const PLAN_FIELDS = ['title', 'date', 'time', 'area', 'venue', 'link'];
export const LIMITS = { title: 80, area: 40, venue: 80, link: 300 };
export const MIN_FILL_MS = 3000;

const clean = (v) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
// 10+ digit runs (phone numbers) and emails are rejected so no contact details get published.
const hasContact = (s) => /\d[\d\s().-]{8,}\d/.test(s) || /\S+@\S+\.\S+/.test(s);

export function validatePlan(body, { now = new Date(), startedAt, counters } = {}) {
  const screen = screenSubmission(body, counters ?? { ipCountThisHour: 0, totalEntries: 0 });
  if (!screen.store) return { ok: screen.ok, store: false, status: screen.status, error: screen.error };
  if (startedAt !== undefined && now.getTime() - startedAt < MIN_FILL_MS) return { ok: true, store: false, status: 200 };
  const plan = {};
  const errors = [];
  for (const f of PLAN_FIELDS) plan[f] = clean(body?.[f]);
  for (const [f, max] of Object.entries(LIMITS)) if (plan[f].length > max) errors.push(`${f} too long`);
  for (const f of ['title', 'date', 'area']) if (!plan[f]) errors.push(`${f} required`);
  for (const f of ['title', 'area', 'venue']) if (hasContact(plan[f])) errors.push(`${f} must not contain contact details`);
  if (plan.date) {
    const d = new Date(plan.date + 'T00:00:00+05:30');
    const today = new Date(now.getTime() + 5.5 * 3600e3).toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.date) || Number.isNaN(d.getTime())) errors.push('date invalid');
    else if (plan.date < today) errors.push('date is in the past');
  }
  if (plan.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(plan.time)) errors.push('time invalid');
  if (plan.link) {
    try { const u = new URL(plan.link); if (u.protocol !== 'https:' || u.username || u.password) errors.push('link must be plain https'); }
    catch { errors.push('link invalid'); }
  }
  if (errors.length) return { ok: false, store: false, status: 400, errors };
  return { ok: true, store: true, status: 200, plan: { ...plan, status: 'pending' } };
}
