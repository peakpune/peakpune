// Birthday wall: list approved birthdays, send a birthday for review, and make a private
// offer to plan, host or join. All text via textContent. Offers carry the member's name
// and WhatsApp number to the owner only; nothing is published or counted publicly.
const $ = (s) => document.querySelector(s);
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
const wall = $('#birthday-wall'), wallStatus = $('#birthday-wall-status'), form = $('#birthday-form'), formStatus = $('#birthday-form-status');
const startedAt = Date.now();
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const KIND_LABEL = { plan: 'Plan something', host: 'Host it', join: 'Join the party' };
const post = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const istToday = () => { const d = new Date(Date.now() + 330 * 60000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
const daysUntil = (month, day) => {
  const today = istToday();
  const y = new Date(today).getUTCFullYear();
  let occ = Date.UTC(y, month - 1, day);
  if (occ < today) occ = Date.UTC(y + 1, month - 1, day);
  return Math.round((occ - today) / 86400000);
};
const whenLabel = (b) => {
  const d = daysUntil(b.month, b.day);
  const base = `${b.day} ${MONTHS[b.month - 1]}`;
  return d === 0 ? `${base} · today` : d === 1 ? `${base} · tomorrow` : `${base} · in ${d} days`;
};

function offerBox(card, b, kind, actions) {
  actions.replaceChildren();
  const note = el('p', `Your name and WhatsApp number go to the owner only, so he can connect you with ${b.name} privately. Nothing is published.`, 'note');
  const name = document.createElement('input'); name.placeholder = 'Your name'; name.maxLength = 80; name.setAttribute('aria-label', 'Your name');
  const phone = document.createElement('input'); phone.placeholder = 'Your WhatsApp number'; phone.maxLength = 20; phone.setAttribute('aria-label', 'Your WhatsApp number'); phone.inputMode = 'tel';
  const send = el('button', 'Send privately', 'chip'); send.type = 'button';
  const status = el('p', '', 'note'); status.setAttribute('role', 'status');
  send.onclick = async () => {
    if (!name.value.trim() || !phone.value.trim()) { status.textContent = 'Add your name and number.'; return; }
    send.disabled = true;
    try {
      const r = await post('/api/birthday-interest', { birthday_id: b.id, kind, name: name.value.trim(), phone: phone.value.trim(), t: String(startedAt) });
      if (r.ok) { actions.replaceChildren(el('p', 'Sent for review. If it fits, the owner connects you on WhatsApp.', 'note')); }
      else { status.textContent = r.status === 429 ? 'Too many tries. Please try later.' : 'Could not send.'; send.disabled = false; }
    } catch { status.textContent = 'Could not send. Check your connection.'; send.disabled = false; }
  };
  const cancel = el('button', 'Cancel', 'chip'); cancel.type = 'button';
  cancel.onclick = () => { actions.replaceChildren(...chips(b, actions)); };
  actions.append(note, name, phone, send, cancel, status);
}

function chips(b, actions) {
  return Object.keys(KIND_LABEL).map((kind) => {
    const c = el('button', KIND_LABEL[kind], 'chip'); c.type = 'button';
    c.onclick = () => offerBox(null, b, kind, actions);
    return c;
  });
}

function card(b) {
  const c = el('article', '', 'card plan-card'), inner = el('div', '', 'inner');
  inner.append(el('span', whenLabel(b), 'eyebrow'), el('h3', b.name));
  if (b.age) inner.append(el('p', `Turns ${b.age}.`, 'note'));
  inner.append(el('p', `Wants: ${b.wish}`), el('p', `Likes: ${b.likes}`), el('p', b.note, 'note'));
  const actions = el('p', '', 'plan-actions');
  actions.append(...chips(b, actions));
  inner.append(actions);
  c.append(inner);
  return c;
}

async function load() {
  if (!wall) return;
  try {
    const r = await fetch('/api/birthdays');
    if (!r.ok) throw new Error();
    const { birthdays } = await r.json();
    wall.replaceChildren(...birthdays.map(card));
    wallStatus.textContent = birthdays.length
      ? 'Approved birthdays only. Every entry is read by a person first.'
      : 'No birthdays on the wall yet. Add yours below.';
  } catch { wallStatus.textContent = 'The birthday wall is unavailable right now.'; }
}

if (form) form.addEventListener('submit', async (ev) => {
  ev.preventDefault(); formStatus.textContent = '';
  const fd = new FormData(form);
  const body = Object.fromEntries(fd.entries());
  body.t = String(startedAt);
  body.show_age = fd.get('show_age') === 'on';
  for (const f of ['first_name', 'last_name', 'wa_name', 'phone', 'instagram', 'dob_day', 'dob_month', 'dob_year', 'wish', 'likes']) {
    if (!String(body[f] ?? '').trim()) { formStatus.textContent = 'Please fill every required field.'; return; }
  }
  body.dob_day = Number(body.dob_day); body.dob_month = Number(body.dob_month); body.dob_year = Number(body.dob_year);
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    const r = await post('/api/birthdays', body);
    const j = await r.json().catch(() => ({}));
    if (r.ok) { form.reset(); formStatus.textContent = 'Thanks. A person will read it before it shows here.'; }
    else formStatus.textContent = r.status === 429 ? 'Too many submissions. Please try again later.' : (j.error ? 'Could not send: ' + j.error : 'Could not send.');
  } catch { formStatus.textContent = 'Could not send. Check your connection.'; }
  btn.disabled = false;
});
load();
