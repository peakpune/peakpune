// Makes one 1200x630 share image per page into public/og/, in the Peak Pune brand (Fraunces, Inter, Peth Paper, Wada Brick, Haldi, Mutha Sage, Misal Clay).
// Top-level pages are hand-set below (headline, line, tag, colour, motif). Place and trek pages use their own name plus a section motif.
// Dev-only: needs Google Chrome on PATH as google-chrome. The generated PNGs are committed, so CI and Cloudflare never run this.
//   node scripts/og/generate.mjs
import { build, ogSlug } from '../build.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = process.cwd();
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const unesc = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const INK = '#1C1410', PAPER = '#F6EFE2', BRICK = '#B8381F', HALDI = '#E8A317', SAGE = '#C9D6B5', CLAY = '#D9B99B';
const S = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
// Motifs: 300x300 flat shapes with Ink outlines, like the brand kit.
const M = {
  pin: `<path d="M150 36C94 36 58 80 58 128c0 64 92 140 92 140s92-76 92-140c0-48-36-92-92-92z" fill="${BRICK}" ${S}/><circle cx="150" cy="128" r="34" fill="${PAPER}" ${S}/>`,
  calendar: `<rect x="48" y="62" width="204" height="190" rx="16" fill="#fff" ${S}/><path d="M48 78a16 16 0 0 1 16-16h172a16 16 0 0 1 16 16v34H48z" fill="${BRICK}" ${S}/><path d="M100 40v44M200 40v44" ${S}/><rect x="76" y="132" width="36" height="30" fill="${HALDI}" ${S}/><rect x="132" y="132" width="36" height="30" fill="#fff" ${S}/><rect x="188" y="132" width="36" height="30" fill="#fff" ${S}/><rect x="76" y="184" width="36" height="30" fill="#fff" ${S}/><rect x="132" y="184" width="36" height="30" fill="#fff" ${S}/>`,
  people: `<circle cx="150" cy="96" r="38" fill="${HALDI}" ${S}/><path d="M86 232c0-44 28-78 64-78s64 34 64 78z" fill="${HALDI}" ${S}/><circle cx="64" cy="124" r="26" fill="${BRICK}" ${S}/><path d="M20 232c0-32 18-56 44-56 10 0 18 3 26 8" fill="${BRICK}" ${S}/><circle cx="236" cy="124" r="26" fill="${SAGE}" ${S}/><path d="M280 232c0-32-18-56-44-56-10 0-18 3-26 8" fill="${SAGE}" ${S}/>`,
  bubbles: `<path d="M40 60h150a16 16 0 0 1 16 16v76a16 16 0 0 1-16 16H100l-40 34v-34H40a16 16 0 0 1-16-16V76a16 16 0 0 1 16-16z" fill="#fff" ${S}/><path d="M110 168h110a16 16 0 0 1 16 16v60a16 16 0 0 1-16 16h-8v30l-36-30h-66a16 16 0 0 1-16-16v-60a16 16 0 0 1 16-16z" fill="${BRICK}" ${S} transform="translate(30 -20)"/><circle cx="76" cy="114" r="8" fill="${INK}"/><circle cx="108" cy="114" r="8" fill="${INK}"/><circle cx="140" cy="114" r="8" fill="${INK}"/>`,
  metro: `<rect x="66" y="44" width="168" height="180" rx="40" fill="#fff" ${S}/><rect x="88" y="72" width="124" height="64" rx="14" fill="${SAGE}" ${S}/><path d="M66 164h168" ${S}/><circle cx="104" cy="194" r="11" fill="${HALDI}" ${S}/><circle cx="196" cy="194" r="11" fill="${HALDI}" ${S}/><path d="M92 224l-24 40M208 224l24 40M40 264h220" ${S}/>`,
  mountain: `<circle cx="226" cy="76" r="30" fill="${HALDI}" ${S}/><path d="M20 254L116 80l56 96 28-44 80 122z" fill="${SAGE}" ${S}/><path d="M116 80l-26 48 26 18 24-20z" fill="#fff" ${S}/><path d="M116 80V44" ${S}/><path d="M116 44l30 12-30 12z" fill="${BRICK}" ${S}/>`,
  fort: `<path d="M44 262V120h28V96h28v24h24V96h28v24h24V96h28v24h28v142z" fill="${CLAY}" ${S}/><path d="M44 262V120h212v142" fill="none" ${S}/><path d="M116 262v-58a34 34 0 0 1 68 0v58z" fill="${INK}" ${S}/><path d="M150 96V40" ${S}/><path d="M150 40l44 14-44 14z" fill="${BRICK}" ${S}/>`,
  market: `<path d="M40 120h220l-16-60H56z" fill="${BRICK}" ${S}/><path d="M84 60l-8 60M120 60l-4 60M150 60v60M180 60l4 60M216 60l8 60" ${S}/><path d="M56 120a31 24 0 0 0 62 0a31 24 0 0 0 62 0a31 24 0 0 0 62 0" fill="${HALDI}" ${S}/><rect x="56" y="156" width="188" height="100" fill="#fff" ${S}/><rect x="80" y="180" width="52" height="40" fill="${SAGE}" ${S}/><circle cx="186" cy="200" r="22" fill="${HALDI}" ${S}/>`,
  sky: `<path d="M178 40a104 104 0 1 0 82 160A92 92 0 0 1 178 40z" fill="${HALDI}" ${S}/><path d="M236 70l7 18 18 7-18 7-7 18-7-18-18-7 18-7z" fill="#fff" ${S}/><path d="M66 70l5 12 12 5-12 5-5 12-5-12-12-5 12-5z" fill="#fff" ${S}/><circle cx="250" cy="236" r="10" fill="#fff" ${S}/>`,
  cake: `<rect x="54" y="150" width="192" height="100" rx="12" fill="${CLAY}" ${S}/><path d="M54 176c16 16 32 16 48 0s32-16 48 0 32 16 48 0 32-16 48 0V150H54z" fill="#fff" ${S}/><path d="M104 150v-44M150 150v-44M196 150v-44" ${S}/><path d="M104 62c-14 14-14 30 0 36 14-6 14-22 0-36zM150 62c-14 14-14 30 0 36 14-6 14-22 0-36zM196 62c-14 14-14 30 0 36 14-6 14-22 0-36z" fill="${HALDI}" ${S}/>`,
  radar: `<circle cx="150" cy="150" r="106" fill="${SAGE}" ${S}/><circle cx="150" cy="150" r="70" fill="none" ${S}/><circle cx="150" cy="150" r="34" fill="none" ${S}/><path d="M150 150L236 84" ${S}/><circle cx="150" cy="150" r="10" fill="${INK}"/><circle cx="214" cy="110" r="12" fill="${BRICK}" ${S}/><circle cx="104" cy="196" r="12" fill="${HALDI}" ${S}/><circle cx="120" cy="100" r="9" fill="#fff" ${S}/>`,
  link: `<rect x="40" y="108" width="132" height="64" rx="32" fill="${HALDI}" ${S} transform="rotate(-35 106 140)"/><rect x="128" y="130" width="132" height="64" rx="32" fill="${BRICK}" ${S} transform="rotate(-35 194 162)"/><rect x="100" y="126" width="100" height="48" rx="24" fill="none" ${S} transform="rotate(-35 150 150)"/>`,
  envelope: `<rect x="40" y="76" width="220" height="150" rx="14" fill="#fff" ${S}/><path d="M40 90l110 82 110-82" fill="none" ${S}/><circle cx="236" cy="82" r="28" fill="${BRICK}" ${S}/><path d="M236 70v24M224 82h24" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`,
  film: `<path d="M36 90h228v38a22 22 0 0 0 0 44v38H36v-38a22 22 0 0 0 0-44z" fill="${BRICK}" ${S}/><path d="M122 120l62 30-62 30z" fill="#fff" ${S}/><path d="M92 90v140" stroke-dasharray="2 14" ${S}/>`,
  compass: `<circle cx="150" cy="150" r="106" fill="#fff" ${S}/><path d="M150 70l26 80-26 80-26-80z" fill="${BRICK}" ${S}/><path d="M150 70l26 80h-52z" fill="${HALDI}" ${S}/><circle cx="150" cy="150" r="9" fill="${INK}"/>`,
  polaroid: `<rect x="50" y="52" width="200" height="216" rx="12" fill="#fff" ${S} transform="rotate(-5 150 160)"/><rect x="72" y="76" width="156" height="128" fill="${SAGE}" ${S} transform="rotate(-5 150 160)"/><circle cx="196" cy="108" r="16" fill="${HALDI}" ${S}/><path d="M78 196l44-52 34 36 22-24 44 40z" fill="${CLAY}" ${S} transform="rotate(-5 150 160)"/>`,
  map: `<path d="M36 80l76-26 76 26 76-26v176l-76 26-76-26-76 26z" fill="#fff" ${S}/><path d="M112 54v176M188 80v176" ${S}/><path d="M68 206c40-10 40-60 80-60s30 40 84-30" fill="none" stroke="${BRICK}" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round"/><path d="M232 52c-18 0-30 14-30 30 0 22 30 46 30 46s30-24 30-46c0-16-12-30-30-30z" fill="${BRICK}" ${S}/><circle cx="232" cy="82" r="10" fill="${PAPER}" ${S}/>`,
  tags: `<circle cx="96" cy="100" r="46" fill="${BRICK}" ${S}/><rect x="158" y="56" width="92" height="88" rx="16" fill="${HALDI}" ${S}/><path d="M96 168l50 88H46z" fill="${SAGE}" ${S} transform="translate(0 -10)"/><circle cx="204" cy="212" r="44" fill="#fff" ${S}/><path d="M184 212h40M204 192v40" ${S}/>`,
  history: `<path d="M60 250V110l90-60 90 60v140z" fill="${CLAY}" ${S}/><path d="M60 250h180M96 250V132M140 250V132M184 250V132M224 250V132" ${S}/><path d="M48 110h204" ${S}/><path d="M150 50l-90 60h180z" fill="${HALDI}" ${S}/>`,
  closed: `<rect x="50" y="70" width="200" height="140" rx="16" fill="${HALDI}" ${S} transform="rotate(-4 150 140)"/><path d="M150 40v40" ${S}/><text x="150" y="160" font-family="Fraunces,Georgia,serif" font-weight="800" font-size="46" text-anchor="middle" fill="${INK}" transform="rotate(-4 150 140)">CLOSED</text><text x="150" y="196" font-family="Inter,sans-serif" font-weight="700" font-size="22" text-anchor="middle" fill="${INK}" transform="rotate(-4 150 140)">1 to 4</text>`,
  sticker: `<rect x="24" y="64" width="252" height="172" rx="14" fill="${HALDI}" ${S} transform="rotate(-4 150 150)"/><text x="150" y="140" font-family="Noto Sans Devanagari,Inter,sans-serif" font-weight="700" font-size="34" text-anchor="middle" fill="${INK}" transform="rotate(-4 150 150)">दुपारी १ ते ४</text><text x="150" y="186" font-family="Noto Sans Devanagari,Inter,sans-serif" font-weight="700" font-size="34" text-anchor="middle" fill="${INK}" transform="rotate(-4 150 150)">दुकान बंद</text>`,
};
const BG = { pin: CLAY, calendar: SAGE, people: PAPER, bubbles: SAGE, metro: HALDI, mountain: CLAY, fort: SAGE, market: CLAY, sky: '#E7DDCB', cake: SAGE, radar: HALDI, link: SAGE, envelope: CLAY, film: HALDI, compass: SAGE, polaroid: CLAY, map: SAGE, tags: CLAY, history: SAGE, closed: SAGE, sticker: PAPER };
// slug: [tag, headline, line, motif]
const HAND = {
  offline: ['New to Pune', 'Moved to Pune? Your phone is not the plan.', 'How to find your people and get offline.', 'compass'],
  women: ['For women', 'Go be unbothered. Pune is better with you in it.', 'Find your people, at your own pace.', 'polaroid'],
  volunteer: ['Contribute', 'Help Peak Pune show you what is on', 'For hosts, volunteers and community builders.', 'people'],
  baddies: ['Peak Pune Baddies', 'Pune has a night. You have a plan.', 'Girls nights, new friends and plans for every baddie in Pune.', 'pin'],
  home: ['Pune radar', 'Everything Pune, in one scroll.', 'Places, events, meetups and moments.', 'sticker'],
  meet: ['Meet Nº 1', 'Peak Pune First Meet', '5:30 PM · Shivajinagar park · 10 people max', 'calendar'],
  events: ['Events', 'What is on in Pune', 'Gigs, shows, runs and plans, each linked to its source.', 'calendar'],
  'peakpune-events': ['Events', 'Peak Pune events', 'Events hosted by Peak Pune itself.', 'calendar'],
  places: ['Places', 'Places to visit in Pune', 'Museums, bookstores, cafes and heritage, with addresses and timings.', 'pin'],
  map: ['City map', 'Pune on one map', 'Museums, cafes, temples and bookstores, pinned on a detailed city map.', 'map'],
  koregaonpark: ['Area guide', 'Koregaon Park', 'Map and guide: restaurants, cafes, bars and parks.', 'map'],
  eastpune: ['Area guide', 'East Pune', 'Map and guide: Kalyani Nagar, Viman Nagar, Kharadi, Magarpatta and more.', 'map'],
  meetups: ['Meetups', 'Pune communities', 'Running, trekking, travel and cycling groups you can join.', 'people'],
  groups: ['Groups', 'Pune WhatsApp groups', 'Channels and group chats for runners, trekkers and travellers, run by their own admins.', 'bubbles'],
  links: ['Links', 'Peak Pune links', 'Instagram, WhatsApp, events, places and communities, in one place.', 'link'],
  manifesto: ['Manifesto', 'Less scrolling. More living.', 'The Peak Pune manifesto.', 'radar'],
  'watch-together': ['Watch together', 'Pool up for the same film', 'See the headcount for each show, then book your own tickets.', 'film'],
  partner: ['Partner', 'Work with Peak Pune', 'Cafes, venues, organisers and communities: send a short note.', 'envelope'],
  about: ['About', 'About Peak Pune', 'Who it is for, and what the radar does.', 'compass'],
  moments: ['Moments', 'Pune moments', 'Genuine moments from around the city, coming soon.', 'polaroid'],
  'powered-by': ['Powered by', 'Powered by the community', 'PuneRunners, Pune Trekkers and Karawaan.', 'people'],
  birthdays: ['Birthdays', 'Pune birthdays', 'Upcoming birthdays in the community, and how each would like to celebrate.', 'cake'],
  outdoors: ['Runs and treks', 'Runs and treks near Pune', 'Running loops and treks, with distances and drive times.', 'mountain'],
  interests: ['Interests', 'Pune by interest', 'Treks, running, books, history, food and more.', 'tags'],
  history: ['History', 'History of Pune', 'A sourced timeline in English and Marathi.', 'history'],
  markets: ['Markets', 'Where Pune shops', 'Market areas and standout shops, from Laxmi Road to FC Road.', 'market'],
  sky: ['Sky', 'Pune sky calendar', 'Moon phases, eclipses, planets and meteor showers for the next 3 months.', 'sky'],
  punemetroguide: ['Metro guide', 'Pune Metro guide', 'Lines, stations, fares and an offline journey planner.', 'metro'],
  404: ['404', 'Closed 1 to 4', 'This page is closed, possibly forever.', 'closed'],
};
const pages = [];
build({ dryRun: true, onPage: (path, html) => {
  pages.push({ path, title: (html.match(/<title>(.*?)<\/title>/s) || [])[1] || '', desc: (html.match(/<meta name="description" content="(.*?)">/s) || [])[1] || '', h1: (html.match(/<h1[^>]*>(.*?)<\/h1>/s) || [])[1] || '' });
} });
const font = 'file://' + resolve(root, 'public/fonts/fraunces.woff2');
const inter = 'file://' + resolve(root, 'public/fonts/inter.woff2');
const tmp = '/tmp/og-work'; mkdirSync(tmp, { recursive: true });
mkdirSync(join(root, 'public/og'), { recursive: true });
let n = 0;
for (const pg of pages) {
  const slug = ogSlug(pg.path);
  if (pg.path === '/stops/') continue; // redirect page, noindex
  let tag, headline, line, motif;
  if (HAND[slug]) [tag, headline, line, motif] = HAND[slug];
  else {
    const isOut = pg.path.startsWith('/outdoors/');
    tag = isOut ? 'Runs and treks' : 'Places'; motif = isOut ? 'mountain' : 'pin';
    headline = unesc(pg.title.split(' | ')[0]).replace(/^(Places to visit in Pune|Running routes in Pune and treks near Pune)[:,].*/, (m) => m);
    const short = unesc(pg.h1);
    if (short && short.length < 60) headline = short;
    const full = unesc(pg.desc);
    line = /check|curat|verif|vetted|review/i.test(full) ? (isOut ? 'A Pune run or trek, with distance and route details.' : 'A place worth knowing in Pune, with address and timings.') : (full.length > 104 ? full.slice(0, 104).replace(/\s+\S*$/, '').replace(/[.,;:]+$/, '') + '…' : full);
  }
  const big = headline.length > 40 ? 58 : headline.length > 26 ? 68 : 80;
  const url = 'peakpune.com' + (pg.path === '/' || pg.path === '/404.html' ? '' : pg.path.replace(/\/$/, ''));
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;src:url('${font}');font-weight:100 900}@font-face{font-family:Inter;src:url('${inter}');font-weight:100 900}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:${PAPER};color:${INK};font-family:Inter,sans-serif;position:relative;overflow:hidden}
.bar{position:absolute;left:72px;top:56px;font:800 40px Fraunces,Georgia,serif}.bar b{color:${BRICK}}
.tag{position:absolute;left:72px;top:150px;background:${HALDI};border:4px solid ${INK};box-shadow:5px 5px 0 ${INK};padding:6px 22px;border-radius:999px;font:700 22px Inter,sans-serif}
h1{position:absolute;left:72px;width:640px;top:216px;margin:0;font:800 ${big}px/1.05 Fraunces,Georgia,serif;letter-spacing:-0.02em;max-height:230px;overflow:hidden}
p{position:absolute;left:72px;width:600px;top:458px;margin:0;font:500 26px/1.38 Inter,sans-serif;color:#50453E;max-height:72px;overflow:hidden}
.card{position:absolute;left:748px;top:96px;width:380px;height:380px;background:${BG[motif]};border:4px solid ${INK};border-radius:28px;box-shadow:10px 10px 0 ${INK};transform:rotate(2deg);display:flex;align-items:center;justify-content:center}
.card svg{width:320px;height:320px}
.foot{position:absolute;left:0;right:0;bottom:0;height:58px;background:${BRICK};border-top:4px solid ${INK};color:#fff;font:700 24px Inter,sans-serif;padding:11px 72px;letter-spacing:.01em}
</style><div class="bar">Peak <b>Pune</b></div><div class="tag">${esc(tag)}</div><h1>${esc(headline)}</h1><p>${esc(line)}</p><div class="card"><svg viewBox="0 0 300 300">${M[motif]}</svg></div><div class="foot">${esc(url)}</div>`;
  writeFileSync(join(tmp, slug + '.html'), html);
  const out = slug === 'home' ? join(root, 'public/og.png') : join(root, 'public/og', slug + '.png');
  if (process.env.RESUME && existsSync(out) && statSync(out).mtimeMs > Number(process.env.RESUME)) continue;
  execFileSync('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=800', `--screenshot=${out}`, 'file://' + join(tmp, slug + '.html')], { stdio: 'ignore' });
  n++;
}
console.log(`Wrote ${n} share images (home is public/og.png, the rest in public/og/)`);
