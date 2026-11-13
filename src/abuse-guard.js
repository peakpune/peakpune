// Dormant, dependency-free abuse-guard helpers for a FUTURE form backend.
// Not imported by any page or script. PeakPune has no backend and submissions are closed,
// so this protects nothing today. Pattern adapted from the Afterhours signup API.
// No storage, network, env vars or credentials here: the caller supplies the counters.

export const HONEYPOT_FIELD = 'website';
export const RATE_LIMIT_PER_HOUR = 5;
export const MAX_ENTRIES = 5000;

// True when a bot filled the hidden field. Real people never see it.
// On true: answer with a fake success and store nothing.
export function isHoneypotTripped(body, field = HONEYPOT_FIELD) {
  if (!body || typeof body !== 'object') return false;
  const v = body[field];
  return v !== undefined && v !== null && String(v).trim() !== '';
}

// Markup for the hidden field: off-screen, skipped by tab and screen readers, no autofill.
export function honeypotFieldHtml(field = HONEYPOT_FIELD) {
  if (!/^[a-z][a-z0-9_-]*$/i.test(field)) throw new TypeError('Invalid field name');
  return `<input type="text" name="${field}" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">`;
}

// Decide from counters the caller already incremented (this hour's count for the IP, total entries).
export function checkLimits({ ipCountThisHour, totalEntries }, { perHour = RATE_LIMIT_PER_HOUR, maxEntries = MAX_ENTRIES } = {}) {
  if (ipCountThisHour > perHour) return { ok: false, status: 429, error: 'too many submissions, try later' };
  if (totalEntries > maxEntries) return { ok: false, status: 503, error: 'full' };
  return { ok: true };
}

// Single entry point a future handler can call first.
export function screenSubmission(body, counters) {
  if (isHoneypotTripped(body)) return { ok: true, store: false, status: 200 };
  const r = checkLimits(counters);
  return r.ok ? { ok: true, store: true, status: 200 } : { ...r, store: false };
}
