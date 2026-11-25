// Watch together: list open pools, start one, join one. Headcounts only.
// All text goes through textContent. Nothing here collects a name or a number.
const $ = (s) => document.querySelector(s);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const wall = $('#pool-wall'), wallStatus = $('#pool-wall-status'), form = $('#pool-form'), formStatus = $('#pool-form-status');
const startedAt = Date.now();
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const MINE_KEY = 'pp-pools-joined';
const mine = () => { try { return JSON.parse(localStorage.getItem(MINE_KEY) || '{}'); } catch { return {}; } };
const remember = (id, v) => { try { const m = mine(); m[id] = v; localStorage.setItem(MINE_KEY, JSON.stringify(m)); } catch { /* private mode */ } };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayLabel = (iso) => { const d = new Date(iso + 'T00:00:00Z'); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const time12 = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };
const AREAS = [...form.querySelectorAll('select[name=area] option')].map((o) => o.value).filter(Boolean);

function joinPanel(pool, panel) {
  panel.replaceChildren();
  const prev = mine()[pool.id];
  const area = document.createElement('select'); area.setAttribute('aria-label', 'Where you are coming from');
  area.append(Object.assign(el('option', 'Where are you coming from?'), { value: '', disabled: true, selected: !prev }));
  for (const a of AREAS) { const o = el('option', a); o.value = a; if (prev?.area === a) o.selected = true; area.append(o); }
  const fs = document.createElement('fieldset'); fs.className = 'pool-shows';
  fs.append(el('legend', 'Shows that work for you'));
  const boxes = pool.shows.map((s) => {
    const lab = document.createElement('label'); lab.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:.5rem';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = s.idx; cb.style.cssText = 'width:auto;margin:0';
    cb.checked = prev ? prev.options.includes(s.idx) : false;
    lab.append(cb, el('span', `${s.cinema}, ${time12(s.time)}`)); fs.append(lab); return cb;
  });
  const go = el('button', prev ? 'Update my answers' : "I'm in", 'chip'); go.type = 'button';
  const status = el('p', '', 'note'); status.setAttribute('role', 'status');
  go.onclick = async () => {
    const options = boxes.filter((b) => b.checked).map((b) => Number(b.value));
    if (!area.value || !options.length) { status.textContent = 'Choose where you are coming from and at least one show.'; return; }
    go.disabled = true;
    try {
      const r = await post('/api/pool-join', { pool_id: pool.id, area: area.value, options });
      if (r.ok) { remember(pool.id, { area: area.value, options }); await load(); }
      else { status.textContent = r.status === 429 ? 'Too many tries. Please try later.' : 'Could not join. The pool may have ended.'; go.disabled = false; }
    } catch { status.textContent = 'Could not join. Check your connection.'; go.disabled = false; }
  };
  panel.append(area, fs, go, status);
}

function card(pool) {
  const c = el('article', '', 'card plan-card'), inner = el('div', '', 'inner');
  inner.append(el('span', dayLabel(pool.date), 'eyebrow'), el('h3', pool.film));
  const lead = pool.shows.find((s) => s.idx === pool.lead) ?? pool.shows[0];
  if (pool.on) {
    inner.append(el('p', `It's on: ${lead.cinema}, ${time12(lead.time)}. ${lead.count} of ${pool.target} can make it.`));
    const a = el('a', 'Book on District', 'chip'); a.href = pool.book; a.target = '_blank'; a.rel = 'noopener noreferrer'; inner.append(a);
    inner.append(el('p', 'Book adjacent seats, about two thirds back, in the centre block. Each person books their own.', 'note'));
  } else {
    inner.append(el('p', `Leading: ${lead.cinema}, ${time12(lead.time)}. ${lead.count} of ${pool.target} so far.`));
  }
  const list = el('ul', '', 'note');
  for (const s of pool.shows) list.append(el('li', `${s.cinema}, ${time12(s.time)}: ${s.count} of ${pool.target}`));
  inner.append(list);
  inner.append(el('p', `${pool.joined} in, from ${pool.areas.map((a) => `${a.area} ${a.count}`).join(', ')}.`, 'note'));
  const panel = el('div', '', 'plan-actions');
  joinPanel(pool, panel);
  inner.append(panel);
  const share = el('a', 'Share this pool', 'chip');
  share.href = `https://wa.me/?text=${encodeURIComponent(`Anyone up for ${pool.film} on ${dayLabel(pool.date)}? Join the pool: ${location.origin}/watch-together/`)}`;
  share.target = '_blank'; share.rel = 'noopener noreferrer';
  const report = el('button', 'Report', 'chip'); report.type = 'button';
  report.onclick = async () => { report.disabled = true; try { await post('/api/pool-report', { pool_id: pool.id }); report.textContent = 'Reported'; } catch { report.disabled = false; } };
  inner.append(el('p', pool.note, 'note'), share, report);
  c.append(inner);
  return c;
}

async function load() {
  try {
    const r = await fetch('/api/pools', { cache: 'no-store' });
    if (!r.ok) throw new Error();
    const { pools } = await r.json();
    wall.replaceChildren(...pools.map(card));
    wallStatus.textContent = pools.length ? '' : 'No open pools yet. Start the first one below.';
  } catch { wallStatus.textContent = 'Pools could not be loaded right now.'; }
}

function disableForm() {
  for (const f of form.querySelectorAll('input, select, button')) f.disabled = true;
  formStatus.textContent = 'Pools are not being accepted yet. Nothing you enter can be sent or saved.';
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(form);
  const options = [0, 1, 2].map((i) => ({ cinema: String(fd.get('cinema' + i) || '').trim(), time: String(fd.get('time' + i) || '') })).filter((o) => o.cinema || o.time);
  const body = { film: fd.get('film'), date: fd.get('date'), target: Number(fd.get('target')), area: fd.get('area'), options, link: fd.get('link'), website: fd.get('website'), t: String(startedAt) };
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true; formStatus.textContent = '';
  try {
    const r = await post('/api/pools', body);
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      if (j.id) remember(j.id, { area: body.area, options: options.map((_, i) => i) });
      form.reset(); formStatus.textContent = 'Your pool is live above.'; await load();
    } else if (r.status === 503) disableForm();
    else formStatus.textContent = r.status === 429 ? 'Too many tries. Please try later.' : (j.error || 'Could not start the pool.');
  } catch { formStatus.textContent = 'Could not send. Check your connection.'; }
  btn.disabled = false;
});

(async () => {
  const probe = await fetch('/api/pools', { cache: 'no-store' }).catch(() => null);
  if (!probe || !probe.ok) disableForm();
  await load();
})();
