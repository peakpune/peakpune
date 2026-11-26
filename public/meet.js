// Peak Pune Meet 1: interest count and form. The public count is all this page ever shows.
const EVENT = 'meet-1', CAP = 12;
const $ = (id) => document.getElementById(id);
const spots = $('mt-spots'), left = $('mt-left'), form = $('mt-form'), status = $('mt-status');
const startedAt = Date.now();
let taken = null;

for (let i = 0; i < CAP; i++) spots.appendChild(document.createElement('i'));
function paint(mine) {
  [...spots.children].forEach((e, i) => { e.className = taken !== null && i < taken ? (mine && i === mine - 1 ? 'me' : 'on') : ''; });
  if (taken === null) left.textContent = '';
  else left.textContent = taken >= CAP ? 'The first 12 spots are full. Your interest is on the waitlist.' : `${CAP - taken} of ${CAP} spots left`;
}
async function load() {
  try { const r = await fetch(`/api/meet-rsvp?event=${EVENT}`, { cache: 'no-store' }); const j = await r.json(); taken = Number.isInteger(j.count) ? j.count : null; }
  catch { taken = null; }
  paint();
}
load();


const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add('mt-in')), { threshold: 0.1 });
document.querySelectorAll('.mt-reveal').forEach((e) => io.observe(e));
document.getElementById('mt-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.getElementById('mt-message').textContent); document.getElementById('mt-copy').textContent='Copied'; } catch { document.getElementById('mt-copy').textContent='Select and copy the text'; } });

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(form);
  const name = String(fd.get('name') || '').trim(), enjoy = fd.getAll('enjoy'), note = String(fd.get('note') || '').trim();
  if (!name) { form.name.focus(); status.textContent = 'Add your first name.'; return; }
  if (!enjoy.length) { status.textContent = 'Pick at least one activity.'; return; }
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; status.textContent = '';
  try {
    const r = await fetch('/api/meet-rsvp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event: EVENT, name, day: fd.get('day'), enjoy, note, website: fd.get('website'), t: String(startedAt) }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      taken = j.count; paint(j.spot); form.hidden = true;
      if (j.waitlist) $('mt-done').querySelector('p').textContent = 'The first 12 spots are full, but we have your interest. WhatsApp will open with your waitlist message ready. Tap Send to deliver it to Aakash. If it does not open, copy the text below.';
      $('mt-who').textContent = name.split(' ')[0]; $('mt-badge').textContent = j.waitlist ? 'Waitlist' : `Founding Member #${j.spot}`;
      const picks = {sat:'Saturday 28 Nov',sun:'Sunday 29 Nov',weekday:'Weekday',any:'Either works'}, things={mall:'Mall meetup',movie:'Movie plan',laser:'Laser tag',paintball:'Paintball',games:'Board games',walk:'Walk and chai',cafe:'Cafe hangout',streetfood:'Street food',bowling:'Bowling',arcade:'Arcade games'};
      const body = [`Hi Aakash, I\'m interested in PeakPune Meet Nº 1.`, `Name: ${name}`, `Day: ${picks[fd.get('day')] || fd.get('day')}`, `Activities: ${enjoy.map(x=>things[x]||x).join(', ')}`, ...(note ? [`Anything to add: ${note}`] : []), ...(j.waitlist ? ['Status: waitlist (first 12 spots are full)'] : [])].join('\n');
      $('mt-message').textContent=body; $('mt-copy').textContent='Copy RSVP text'; $('mt-chat').href='https://wa.me/919404828072?text='+encodeURIComponent(body); $('mt-chat').textContent='Open WhatsApp chat';
      const done = $('mt-done'); done.hidden = false; $('mt-done').querySelector('p').textContent = 'Opening your WhatsApp chat with the RSVP filled in. Tap Send there to send it to Aakash. If it does not open, use Copy RSVP text below.';
      setTimeout(() => { window.location.assign($('mt-chat').href); }, 250);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const card = done.parentElement, cols = ['#E8A317', '#B8381F', '#C9D6B5', '#D9B99B'];
        for (let i = 0; i < 36; i++) { const c = document.createElement('i'); c.className = 'mt-confetti'; c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % 4]; c.style.animationDelay = Math.random() * 0.5 + 's'; card.appendChild(c); }
      }
    } else if (r.status === 410) status.textContent = 'The interest list is closed.';
    else if (r.status === 429) status.textContent = 'Too many tries. Please try again later.';
    else if (r.status === 503) status.textContent = 'The list is not available right now. Please try again later.';
    else status.textContent = j.error || 'Could not save. Try again.';
  } catch { status.textContent = 'Could not send. Check your connection.'; }
  btn.disabled = false;
});
