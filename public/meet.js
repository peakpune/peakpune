// Peak Pune Meet 1: interest count and form. The public count is all this page ever shows.
const EVENT = 'meet-1', CAP = 30;
const $ = (id) => document.getElementById(id);
const spots = $('mt-spots'), left = $('mt-left'), form = $('mt-form'), status = $('mt-status');
const startedAt = Date.now();
let taken = null;

for (let i = 0; i < CAP; i++) spots.appendChild(document.createElement('i'));
function paint(mine) {
  [...spots.children].forEach((e, i) => { e.className = taken !== null && i < taken ? (mine && i === mine - 1 ? 'me' : 'on') : ''; });
  if (taken === null) left.textContent = '';
  else left.textContent = taken >= CAP ? 'All 30 spots are taken. Follow the WhatsApp channel for the next one.' : `${CAP - taken} of ${CAP} spots left`;
}
async function load() {
  try { const r = await fetch(`/api/meet-rsvp?event=${EVENT}`, { cache: 'no-store' }); const j = await r.json(); taken = Number.isInteger(j.count) ? j.count : null; }
  catch { taken = null; }
  paint();
}
load();

const mq = $('mt-mq');
mq.innerHTML = 'Less scrolling<span>&#9679;</span>More living<span>&#9679;</span>Meet Nº 1<span>&#9679;</span>Date TBC<span>&#9679;</span>Place TBC<span>&#9679;</span>You decide<span>&#9679;</span>'.repeat(8);

const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('mt-in')), { threshold: 0.1 });
document.querySelectorAll('.mt-reveal').forEach((e) => io.observe(e));

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim(), wa = String(fd.get('wa') || '');
  if (!name) { form.name.focus(); status.textContent = 'Add your first name.'; return; }
  if (wa.replace(/\D/g, '').length < 10) { form.wa.focus(); status.textContent = 'Add a WhatsApp number with at least 10 digits.'; return; }
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; status.textContent = '';
  try {
    const r = await fetch('/api/meet-rsvp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event: EVENT, name, wa, day: fd.get('day'), enjoy: fd.get('enjoy'), website: fd.get('website'), t: String(startedAt) }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      taken = j.count; paint(j.spot); form.hidden = true;
      $('mt-who').textContent = name.split(' ')[0]; $('mt-badge').textContent = `Founding Member #${j.spot}`;
      const done = $('mt-done'); done.hidden = false;
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const card = done.parentElement, cols = ['#E8A317', '#B8381F', '#C9D6B5', '#D9B99B'];
        for (let i = 0; i < 36; i++) { const c = document.createElement('i'); c.className = 'mt-confetti'; c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % 4]; c.style.animationDelay = Math.random() * 0.5 + 's'; card.appendChild(c); }
      }
    } else if (r.status === 409) { taken = CAP; paint(); status.textContent = 'All 30 spots are taken. Follow the WhatsApp channel for the next one.'; }
    else if (r.status === 410) status.textContent = 'The interest list is closed.';
    else if (r.status === 429) status.textContent = 'Too many tries. Please try again later.';
    else if (r.status === 503) status.textContent = 'The list is not available right now. Message us on the WhatsApp channel to join.';
    else status.textContent = j.error || 'Could not save. Try again.';
  } catch { status.textContent = 'Could not send. Check your connection.'; }
  btn.disabled = false;
});
