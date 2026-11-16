// Progressive enhancement only: every page is complete static HTML without this file.
const $ = (s) => document.querySelector(s);

// Old hash links (#/events) now have real URLs.
const base = new URL('.', import.meta.url).pathname;
const legacy = { events: 'events/', meetups: 'meetups/', moments: 'moments/', 'powered-by': 'powered-by/' }[location.hash.replace(/^#\/?/, '')];
if (legacy && location.pathname === base) location.replace(base + legacy);

// Organiser event cards are static HTML: hide the ones whose day has passed.
document.querySelectorAll('.event-card[data-expires]').forEach((c) => { const t = Date.parse(c.dataset.expires); if (Number.isFinite(t) && t < Date.now()) c.hidden = true; });

// Freshness: a listing whose check date is older than its limit says so, in plain words.
document.querySelectorAll('.stale[data-checked]').forEach((el) => {
  const checked = Date.parse(`${el.dataset.checked}T00:00:00+05:30`);
  const limit = Number(el.dataset.maxAge);
  if (!Number.isFinite(checked) || !(limit > 0)) return;
  const days = Math.floor((Date.now() - checked) / 86400000);
  if (days <= limit) return;
  const when = new Date(checked).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  el.textContent = `This was last checked on ${when}, ${days} days ago. Details may have changed: confirm with the venue or organiser before you go.`;
  el.setAttribute('role', 'note');
  el.hidden = false;
});

// On small screens the main navigation scrolls sideways: bring the current page's link into view.
document.querySelector('.site-header nav a[aria-current=page]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
