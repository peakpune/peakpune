// Partner inquiry: builds a pre-filled email from the form. Nothing is stored or sent by this site.
// The user sends the email themselves. All text via textContent.
const TO = 'privacy@peakpune.com';
const $ = (s) => document.querySelector(s);
const form = $('#partner-form'), status = $('#partner-status'), actions = $('#partner-actions'), srcNote = $('#partner-src');
const clean = (v, max) => String(v || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const rawSrc = new URLSearchParams(location.search).get('src') || '';
const src = clean(rawSrc.toLowerCase(), 40).replace(/[^a-z0-9_-]/g, '');
if (src && srcNote) { srcNote.textContent = 'Referred from: ' + src; srcNote.hidden = false; }
const startedAt = Date.now();
const el = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };

form?.addEventListener('submit', (ev) => {
  ev.preventDefault();
  actions.hidden = true; actions.replaceChildren();
  const d = new FormData(form);
  if (clean(d.get('website'), 20) || Date.now() - startedAt < 3000) { status.textContent = 'Please take a moment to fill in the form, then try again.'; return; }
  const kind = clean(d.get('kind'), 40), name = clean(d.get('name'), 80), org = clean(d.get('org'), 80), area = clean(d.get('area'), 40);
  const note = clean(d.get('note'), 500), reply = clean(d.get('reply'), 80);
  let link = clean(d.get('link'), 300);
  if (link) { try { const u = new URL(link); link = u.protocol === 'https:' ? u.href : ''; } catch { link = ''; } }
  if (!name || !org || !note || !reply) { status.textContent = 'Please fill in your name, venue or group, your note and where to reply.'; return; }
  const lines = ['Hi Peak Pune,', '', note, '', 'I am a: ' + kind, 'Name: ' + name, 'Venue, group or brand: ' + org];
  if (area) lines.push('Area: ' + area);
  if (link) lines.push('Link: ' + link);
  lines.push('Reply to: ' + reply);
  if (src) lines.push('Referred from: ' + src);
  const body = lines.join('\n');
  const subject = 'Peak Pune: ' + kind + ' - ' + org;
  const mail = el('a', 'Open my email', 'primary');
  mail.href = 'mailto:' + TO + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const copy = el('button', 'Copy the message instead', 'chip'); copy.type = 'button';
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('To: ' + TO + '\nSubject: ' + subject + '\n\n' + body); status.textContent = 'Copied. Paste it into any email app and send it to ' + TO + '.'; }
    catch { status.textContent = 'Could not copy here. Please send your note to ' + TO + '.'; }
  });
  const back = el('a', 'Back to Peak Pune', 'chip'); back.href = '/';
  actions.append(mail, copy, back); actions.hidden = false;
  status.textContent = 'Your email is ready. Tap "Open my email" and send it when you are comfortable. Nothing has been sent yet.';
});
