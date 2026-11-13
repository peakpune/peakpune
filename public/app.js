// Progressive enhancement only: every page is complete static HTML without this file.
const $ = (s) => document.querySelector(s);

// Old hash links (#/events) now have real URLs.
const base = new URL('.', import.meta.url).pathname;
const legacy = { events: 'events/', meetups: 'meetups/', moments: 'moments/', 'powered-by': 'powered-by/' }[location.hash.replace(/^#\/?/, '')];
if (legacy && location.pathname === base) location.replace(base + legacy);

const dialog = $('#submission');
if (dialog) {
  document.querySelectorAll('[data-action="submission"]').forEach((b) => b.addEventListener('click', () => { dialog.hidden = false; dialog.scrollIntoView({ behavior: 'smooth', block: 'center' }); dialog.querySelector('button').focus({ preventScroll: true }); }));
  $('#close-dialog').addEventListener('click', () => { dialog.hidden = true; });
}

// Organiser event cards are static HTML: hide the ones whose day has passed.
document.querySelectorAll('.event-card[data-expires]').forEach((c) => { const t = Date.parse(c.dataset.expires); if (Number.isFinite(t) && t < Date.now()) c.hidden = true; });
