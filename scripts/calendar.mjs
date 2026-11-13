// Add-to-calendar output for dated organiser events: a Google Calendar link and iCalendar (.ics) files.
// Nothing is invented: an event is timed only when the data carries an exact start time, otherwise it is an
// all-day entry on its listed date. No end time is guessed. Partial listings are marked TENTATIVE.

const pad = (n) => String(n).padStart(2, '0');
const known = (v) => v && v !== 'UNKNOWN';

/** YYYY-MM-DD plus n days, as YYYYMMDD (calendar arithmetic only, no time zone involved). */
export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
}
const compact = (date) => date.replaceAll('-', '');
/** An ISO instant with an offset, as UTC basic format. */
export function utc(iso) {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) throw new Error(`bad timestamp ${iso}`);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}${pad(t.getUTCSeconds())}Z`;
}

/** Which dates the event covers, or null when it has no calendar date (recurring listings). */
export function when(e) {
  if (!e.start_date) return null;
  if (e.start) return { timed: true, start: utc(e.start), end: e.end ? utc(e.end) : null };
  const lastDay = e.end ? e.end.slice(0, 10) : e.start_date;
  return { timed: false, start: compact(e.start_date), end: addDays(lastDay < e.start_date ? e.start_date : lastDay, 1) };
}

const place = (e) => (known(e.address) ? e.address.replace(/\s*\(per [^)]*\)\s*$/, '') : known(e.neighbourhood) ? `${e.neighbourhood}, Pune` : 'Pune');
const note = (e) => `Read from the organiser's page on ${e.checked_at}. Dates and times can change: confirm on the page before you go.`;
const describe = (e, url) => [e.summary, url ? `Details: ${url}` : null, note(e)].filter(Boolean).join('\n\n');

export function googleUrl(e, safeUrl) {
  const w = when(e);
  if (!w) return null;
  const u = new URL('https://calendar.google.com/calendar/render');
  u.searchParams.set('action', 'TEMPLATE');
  u.searchParams.set('text', e.name);
  u.searchParams.set('dates', `${w.start}/${w.end ?? w.start}`);
  u.searchParams.set('details', describe(e, safeUrl(e.url_deep)));
  u.searchParams.set('location', place(e));
  if (w.timed) u.searchParams.set('ctz', 'Asia/Kolkata');
  return u.href;
}

// RFC 5545: escape text, fold lines at 75 octets, CRLF line ends.
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out = [];
  let cur = '';
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74;
    if (enc.encode(cur + ch).length > limit) { out.push(cur); cur = ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function vevent(e, safeUrl, stamp) {
  const w = when(e);
  const url = safeUrl(e.url_deep);
  const lines = ['BEGIN:VEVENT', `UID:${e.id}@peakpune.com`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(e.name)}`];
  if (w.timed) {
    lines.push(`DTSTART:${w.start}`);
    if (w.end) lines.push(`DTEND:${w.end}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${w.start}`, `DTEND;VALUE=DATE:${w.end}`);
  }
  lines.push(`LOCATION:${esc(place(e))}`, `DESCRIPTION:${esc(describe(e, url))}`);
  if (url) lines.push(`URL:${url}`);
  lines.push(`STATUS:${e.status === 'verified' ? 'CONFIRMED' : 'TENTATIVE'}`, 'END:VEVENT');
  return lines;
}

/** One .ics document for the given events (undated ones are skipped). DTSTAMP comes from the check date, so output is reproducible. */
export function ics(events, safeUrl, name = 'Peak Pune events') {
  const dated = events.filter((e) => when(e));
  const stamp = `${compact(dated[0]?.checked_at ?? '1970-01-01')}T000000Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Peak Pune//Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, ...dated.flatMap((e) => vevent(e, safeUrl, stamp)), 'END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export const icsPath = (e) => `/calendar/${e.id}.ics`;
export const ALL_ICS_PATH = '/calendar/peak-pune-events.ics';
