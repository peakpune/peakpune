// Community plans: list approved plans, submit a plan for review, "I'm going" and report. All text via textContent.
const $ = (s) => document.querySelector(s);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const list = $('#community-plans'), status = $('#community-status'), form = $('#plan-form'), formStatus = $('#plan-form-status');
const startedAt = Date.now();
const safeHttps = (u) => { try { const x = new URL(u); return x.protocol === 'https:' && !x.username && !x.password ? x.href : ''; } catch { return ''; } };
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

function card(p) {
  const c = el('article', '', 'card plan-card'), inner = el('div', '', 'inner');
  if (p.image && /^\/api\/image\/[0-9a-f]+$/.test(p.image)) { const i = document.createElement('img'); i.src = p.image; i.alt = ''; i.loading = 'lazy'; i.style.maxWidth = '100%'; inner.append(i); }
  inner.append(el('span', [p.date, p.time].filter(Boolean).join(' · '), 'eyebrow'), el('h3', p.title), el('p', [p.venue, p.area].filter(Boolean).join(', ')), el('p', p.note, 'note'));
  const acts = el('p', '', 'plan-actions');
  const link = safeHttps(p.link); if (link) { const a = el('a', 'Details', 'chip'); a.href = link; a.rel = 'noopener nofollow ugc'; acts.append(a); }
  const label = el('span', p.going || '', 'note');
  const go = el('button', "I'm going", 'chip'); go.type = 'button';
  go.onclick = async () => { go.disabled = true; try { const r = await post('/api/going', { plan_id: p.id }); const j = await r.json(); if (r.ok) label.textContent = j.going || ''; else go.disabled = false; } catch { go.disabled = false; } };
  const rep = el('button', 'Report', 'chip'); rep.type = 'button';
  rep.onclick = async () => { rep.disabled = true; try { await post('/api/report', { plan_id: p.id }); rep.textContent = 'Reported'; } catch { rep.disabled = false; } };
  acts.append(go, rep, label); inner.append(acts); c.append(inner); return c;
}
async function load() {
  if (!list) return;
  try {
    const r = await fetch('/api/plans'); if (!r.ok) throw new Error();
    const { plans } = await r.json();
    list.replaceChildren(...plans.map(card));
    status.textContent = plans.length ? 'Community-posted plans. Approved by a person, not confirmed by the organiser.' : 'No community plans yet. Be the first to post one.';
  } catch { status.textContent = 'Community plans are unavailable right now.'; }
}
if (form) form.addEventListener('submit', async (ev) => {
  ev.preventDefault(); formStatus.textContent = '';
  const fd = new FormData(form); fd.set('t', String(startedAt));
  if (!fd.get('title') || !fd.get('date') || !fd.get('area')) { formStatus.textContent = 'Please add a title, date and area.'; return; }
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    const r = await fetch('/api/plans', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}));
    if (r.ok) { form.reset(); formStatus.textContent = 'Thanks. A person will read it before it shows here.'; }
    else formStatus.textContent = r.status === 429 ? 'Too many submissions. Please try again later.' : (j.error ? 'Could not send: ' + j.error : 'Could not send.');
  } catch { formStatus.textContent = 'Could not send. Check your connection.'; }
  btn.disabled = false;
});
load();
