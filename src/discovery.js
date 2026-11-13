// Adapted, at the owner's request, from PuneAfterhours api/discover.js.
// Source revision: 000cc1c8b441337587d3969cd07e9ec7ddc398ae.
// No Afterhours cache, credentials, member data or non-Pune adapters are used.
// Provider permission review is required before enabling network fetching.
import { istDate, normalizePuneEvents } from './events.js';
const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const fmtDate = (iso) => iso || '';
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
const clip = (s, n) => (s || '')
  .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_#>`\\]+/g, '')
  .replace(/\s+/g, ' ').trim().slice(0, n);
// Resolve the date in Pune, not the UTC calendar day.
const isoFrom = (value) => {
  const date = new Date(value);
  return Number.isNaN(+date) ? null : istDate(date);
};
export function parseMeetupPune(html, cap = 80) {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('no data block');
  const ap = JSON.parse(m[1]).props.pageProps.__APOLLO_STATE__;
  const groups = {};
  for (const v of Object.values(ap)) if (v && v.__typename === 'Group') groups[v.id] = v.name;
  const out = [];
  for (const v of Object.values(ap)) {
    if (!v || v.__typename !== 'Event' || !v.title || !v.dateTime) continue;
    const iso = isoFrom(v.dateTime);
    if (!iso) continue;
    // Local discovery only: skip online/virtual events - they are not Pune/Mumbai plans.
    const vname = (v.venue && v.venue.name) || '';
    if (String(v.eventType || '').toLowerCase() === 'online' || /^\s*(online|virtual)\b/i.test(vname)) continue;
    const venueCity = v.venue?.city || '';
    if (venueCity && String(venueCity).toLowerCase() !== 'pune') continue;
    const gname = groups[(v.group && v.group.__ref || '').split(':')[1]] || '';
    out.push({
      title: clip(v.title, 120), date: iso, dateText: fmtDate(iso),
      desc: clip(v.description, 200),
      place: clip(vname, 90),
      price: v.feeSettings && v.feeSettings.amount != null ? `₹${v.feeSettings.amount}` : '',
      links: v.eventUrl ? [{ url: v.eventUrl, label: 'Meetup' }] : [],
      source: 'Meetup', city: 'Pune',
      group: gname,
    });
  }
  return out.slice(0, cap);
}

// The JSON-LD traversal is adapted from fromDistrictCity in Afterhours.
export function parseDistrictPune(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) throw new Error('District data block missing');
  const out=[];
  for (const block of blocks) {
    let d; try {d=JSON.parse(block[1]);} catch {continue;}
    if (d['@type'] !== 'ItemList') continue;
    for (const item of d.itemListElement || []) {
      const e=item.item || item;const date=isoFrom(e.startDate);
      if (!e.name || !date || !e.url) continue;
      if (e.eventStatus && !/Scheduled/i.test(e.eventStatus)) continue;
      if (e.eventAttendanceMode && /Online/i.test(e.eventAttendanceMode)) continue;
      const location=typeof e.location === 'object' && e.location ? e.location : {};
      const city=typeof location.address === 'object' ? location.address.addressLocality : '';
      if (city && !/^pune$/i.test(city.trim())) continue;
      const offer=Array.isArray(e.offers) ? e.offers[0] : e.offers;
      const price=offer?.price != null && offer.price !== '' ?
        (Number(offer.price) === 0 ? 'Free' : `${offer.priceCurrency || 'INR'} ${offer.price}`) : '';
      out.push({title:clip(e.name,120), date, dateText:fmtDate(date), desc:'',
        place:clip(location.name,90),price,links:[{url:e.url,label:'District'}],source:'District',city:'Pune'});
    }
  }
  return out;
}
export function parseRedditPune(xml) {
  const entries = xml.split('<entry>').slice(1);
  const strip = (h) => decode(h.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const guides = [];
  const events = [];
  for (const e of entries) {
    const title = decode(((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '').trim());
    const url = ((e.match(/<link\s+href="([^"]+)"/) || [])[1] || '').trim();
    const g = title.match(/pune in (january|february|march|april|may|june|july|august|september|october|november|december) (20\d\d)/i);
    if (!g || !url) continue;
    const gm = MONTHS.indexOf(g[1].slice(0, 3).toUpperCase());
    const gy = Number(g[2]);
    guides.push({ title: clip(title, 200), url, month: gm, year: gy });
    const content = decode(((e.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1] || ''));
    for (const blk of content.split(/<p>\s*<strong>/).slice(1)) {
      const m = blk.match(/^([^<]+)<\/strong>\s*<br\/?>\s*<strong>([^<]+)<\/strong>([\s\S]*?)<\/p>/);
      if (!m) continue;
      const dateLine = m[1].trim();
      const mon = (dateLine.toUpperCase().match(/\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/) || [])[1];
      const day = (dateLine.match(/\b(\d{1,2})\b/) || [])[1];
      if (!mon || !day) continue;
      const mi = MONTHS.indexOf(mon);
      const year = mi < gm - 1 ? gy + 1 : gy;
      const rest = m[3];
      const lines = rest.split(/<br\/?>/).map(strip).filter(Boolean);
      const info = lines.filter((l) => l.startsWith('➜')).map((l) => l.replace(/^➜\s*/, ''));
      const links = [...rest.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((x) => ({ url: x[1], label: strip(x[2]) })).filter((l) => /^https?:\/\//.test(l.url)).slice(0, 3);
      events.push({
        title: strip(m[2]).slice(0, 120), date: `${year}-${String(mi + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dateText: dateLine, desc: clip(lines.filter((l) => !l.startsWith('➜') && !/^Tickets:/i.test(l)).join(' '), 200),
        place: clip(info[0] || '', 90), price: clip(info[1] || '', 90), links, source: 'Reddit guide',
        city: /mumbai/i.test(info.join(' ') + ' ' + m[2]) ? 'Mumbai' : 'Pune',
      });
    }
  }
  return { guides, events };
}


export const PUNE_SOURCES = Object.freeze([
  {id:'Meetup Pune',url:'https://www.meetup.com/find/?location=in--pune&source=EVENTS',parser:parseMeetupPune},
  ...['nightlife','music','fests-fairs','performances','food-drinks'].map(genre=>({
    id:`District Pune ${genre}`,url:`https://www.district.in/events/${genre}-in-pune-book-tickets`,parser:parseDistrictPune})),
  {id:'PuneTonight guides',url:'https://www.reddit.com/r/punetonight/.rss?limit=30',parser:xml=>parseRedditPune(xml).events}
]);
const isRestricted = e => /(students|members|alumni|employees)\s+only|invite[-\s]only|closed event|private event/i.test(`${e.title} ${e.desc || ''}`);
// Explicit opt-in and injected transport keep this library offline by default.
// The future server adapter owns provider approvals, caching and a fixed refresh cadence.
export async function fetchPunePlans({enabled=false,fetchText,now=new Date()}={}) {
  if(!enabled) throw new Error('Discovery network fetch is disabled pending provider review');
  if(typeof fetchText !== 'function') throw new TypeError('A reviewed server-side transport is required');
  const results=await Promise.all(PUNE_SOURCES.map(async source=>{
    try {
      const rows=source.parser(await fetchText(source.url));
      const events=normalizePuneEvents(rows.filter(e=>!isRestricted(e)),{today:istDate(now)});
      return {events,status:{source:source.id,state:'ok',count:events.length}};
    } catch {
      return {events:[],status:{source:source.id,state:'unavailable',count:0}};
    }
  }));
  return {pune:normalizePuneEvents(results.flatMap(x=>x.events),{today:istDate(now)}),
    status:results.map(x=>x.status),fetchedAt:now.toISOString(),
    partial:results.some(x=>x.status.state==='unavailable')};
}
