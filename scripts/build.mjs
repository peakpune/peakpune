// Static site build: turns site/ fragments and data/ rows into crawlable pages in public/.
// Audited content renderer used by Astro. Run: npm run build. Set SITE_URL to the production origin.
import { KP_PATH, KP_TITLE, KP_DESCRIPTION, kpMain, kpLd } from './koregaonpark.mjs';
import { EP_PATH, EP_TITLE, EP_DESCRIPTION, epMain, epLd } from './eastpune.mjs';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publishAuditedRows } from '../public/lib/publication.js';
import { googleUrl, ics, icsPath, when, ALL_ICS_PATH } from './calendar.mjs';
import { buildMetroGuide, writeMetroAssets, GUIDE_PATH } from './metro-guide.mjs';
import { buildStops, buildInterests, STOPS_PATH, INTERESTS_PATH } from './discover-pages.mjs';

// Astro bundles this module; cwd remains the project root in both build paths.
const root = process.cwd();
export const SITE_URL = (process.env.SITE_URL || 'https://peakpune.com').replace(/\/+$/, '');
// A project site (https://user.github.io/repo) is served under a sub-path: prefix root links with it.
export const BASE = new URL(SITE_URL + '/').pathname.replace(/\/+$/, '');
import { openExternalLinksInNewTab } from './links.mjs';
export const withBase = (html) => openExternalLinksInNewTab(BASE ? html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`) : html);
// Search indexing is on: the owner turned it on for launch (2026-11-15).
//   INDEXING=off npm run build   builds a noindex copy without the sitemap reference
export const INDEXING = process.env.INDEXING !== 'off';
const ROBOTS = INDEXING ? 'index,follow,max-image-preview:large' : 'noindex,nofollow';
const read = (p) => readFileSync(join(root, p), 'utf8');
export const publicationAudit = JSON.parse(read('data/publication-audit.json'));
export const publishRows = (rows) => publishAuditedRows(rows, publicationAudit);
// New HTML must not reuse an older browser-cached stylesheet or script.
export const assetUrl = (path) => `${path}?v=${createHash('sha256').update(readFileSync(join(root, 'public', path))).digest('hex').slice(0, 12)}`;

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON-LD sits inside a script tag: never let data close it.
export const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
export const safeUrl = (v) => { try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch { return null; } };
const known = (v) => v && v !== 'UNKNOWN';
export const slugOf = (row) => row.id.replace(/^place-/, '');
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

const NAV_GROUPS = [
  ['Explore', [['/places/', 'Places', 'Source-checked places across Pune'], ['/koregaonpark/', 'Koregaon Park', 'Map guide to the KP area'], ['/eastpune/', 'East Pune', 'Guide to East Pune'], ['/interests/', 'Interests', 'Browse by what you like'], ['/markets/', 'Markets', 'Markets and famous shops'], ['/history/', 'History', 'Sourced history of Pune places'], ['/sky/', 'Sky', 'Moon, eclipses, planets and meteor showers']]],
  ['Outdoors and travel', [['/outdoors/', 'Runs and treks', 'Running loops and treks near Pune'], ['/PuneMetroguide/', 'Metro guide', 'Lines, stations and places nearby']]],
  ['Community', [['/meetups/', 'Meetups', 'Groups that organise; we link to them'], ['/watch-together/', 'Watch together', 'Pool up for the same film'], ['/about/', 'About Peak Pune', 'How listings are checked']]],
];
const MENU_GROUPS = [
  ['Start', [['/', 'Home'], ['/events/', 'Events']]],
  ['Explore', [['/places/', 'Places'], ['/koregaonpark/', 'Koregaon Park'], ['/eastpune/', 'East Pune'], ['/interests/', 'Interests'], ['/markets/', 'Markets'], ['/history/', 'History'], ['/sky/', 'Sky']]],
  ['Outdoors and travel', [['/outdoors/', 'Runs and treks'], ['/PuneMetroguide/', 'Metro guide']]],
  ['Community', [['/meetups/', 'Meetups'], ['/watch-together/', 'Watch together'], ['/about/', 'About Peak Pune']]],
];
const TYPE_LABEL = { museum: 'Museums', heritage: 'Heritage and history', temple: 'Temples', bookstore: 'Bookstores', gallery: 'Galleries', 'cultural-centre': 'Cultural centres', archive: 'Archives', cafe: 'Cafes', restaurant: 'Restaurants', bar: 'Bars and brewpubs', sweets: 'Sweets and snacks', park: 'Parks and gardens', zoo: 'Zoo' };
const TYPE_SINGULAR = { museum: 'Museum', heritage: 'Heritage site', temple: 'Temple', bookstore: 'Bookstore', gallery: 'Art gallery', 'cultural-centre': 'Cultural centre', archive: 'Archive', cafe: 'Cafe', restaurant: 'Restaurant', bar: 'Bar and brewpub', sweets: 'Sweet shop', park: 'Park', zoo: 'Zoo' };
const SCHEMA_TYPE = { museum: 'Museum', heritage: 'LandmarksOrHistoricalBuildings', temple: 'HinduTemple', bookstore: 'BookStore', gallery: 'ArtGallery', 'cultural-centre': 'Place', archive: 'ArchiveOrganization', cafe: 'CafeOrCoffeeShop', restaurant: 'Restaurant', bar: 'BarOrPub', sweets: 'FoodEstablishment', park: 'Park', zoo: 'Zoo' };

// Every page has its own 1200x630 share image in public/og/, made by scripts/og/generate.mjs from the page title.
// A page without one falls back to the home image, so a missing file never breaks a build.
export const ogSlug = (path) => (path === '/' ? 'home' : path.replace(/^\/|\/$|\.html$/g, '').replace(/\//g, '-').toLowerCase());
export const ogImagePath = (path) => (existsSync(join(root, 'public/og', `${ogSlug(path)}.png`)) ? `/og/${ogSlug(path)}.png` : '/og.png');
export const ogAlt = (title) => { const t = String(title).split(' | ').filter((x) => x !== 'Peak Pune'); return `Peak Pune: ${t[0] || 'everything Pune, in one scroll'}`; };
const mark = read('site/mark.svg.html');
const cta = read('site/cta.html');
// Link-in-bio pages drop the site header and footer so the page is one column of taps.
const bareStrip = (bare, html) => (bare ? html.replace(/<header class="site-header">[\s\S]*?<\/header>\n?/, '').replace(/<footer class="site-footer">[\s\S]*?<\/footer>\n?/, '') : html);
// Meetups uses the short CTA without the review promise.
const ctaShort = cta.replace(' A person reads every plan before it shows.', '');
// One quotable sentence that says what the site is. Used in the Organization markup, the home page and /about/.
export const ENTITY = 'Peak Pune is Pune\'s unofficial guide to doing interesting shit: a city radar with a short, hand-checked list of things worth leaving the house for, plus source-checked places, running loops, treks and meetups. We do not organise runs or treks; we point to the people who do.';
// A dated check older than this many days gets a visible warning (added in the browser by app.js).
const STALE_DAYS = { venue: 30, event: 7 };
export const staleNote = (date, kind) => (date ? `<p class="stale" data-checked="${esc(date)}" data-max-age="${STALE_DAYS[kind]}" hidden></p>` : '');
const org = { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'Peak Pune', url: `${SITE_URL}/`, logo: `${SITE_URL}/icon.svg`, description: ENTITY, areaServed: { '@type': 'City', name: 'Pune', containedInPlace: { '@type': 'State', name: 'Maharashtra' } }, sameAs: ['https://github.com/peakpune/peakpune', 'https://www.instagram.com/thepeakpune/'] };

export function page({ path, title, description, main, ld = [], current = path, crumbs = [], ogType = 'website', plans = false, nowStrip = false, noindex = false, map = false, ctaText = cta }) {
  const url = SITE_URL + path;
  const graph = [org, ...ld];
  if (crumbs.length) graph.push({ '@type': 'BreadcrumbList', itemListElement: [['Peak Pune', '/'], ...crumbs].map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + p })) });
  const link = ([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`;
  const cur = (h) => (h === current ? ' aria-current="page"' : '');
  const hint = ([href, label, note]) => `<a href="${href}"${cur(href)}>${label}<small>${note}</small></a>`;
  const grp = ([name, items]) => `<details class="grp"${items.some(([h]) => h === current) ? ' data-current' : ''}><summary>${name}</summary><div>${items.map(hint).join('')}</div></details>`;
  const nav = link(['/events/', 'Events']) + `<a class="map" href="/map/"${cur('/map/')}>Map</a>` + NAV_GROUPS.map(grp).join('');
  const mlink = ([href, label]) => `<a href="${href}"${cur(href)}>${label}</a>`;
  const mnav = `<a class="map" href="/map/"${cur('/map/')}>Map of Pune</a>` + MENU_GROUPS.map(([h, items]) => `<h2>${h}</h2><div class="two">${items.map(mlink).join('')}</div>`).join('');
  const trail = crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Peak Pune</a>${crumbs.map(([n, p], i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`)).join('')}</nav>` : '';
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="${noindex ? 'noindex,follow' : ROBOTS}">
${url === `${SITE_URL}/` ? '<meta name="google-site-verification" content="Dm6jseCMG_x2qMQcfdWTmdD-gy92x4m_ahJkQpIZBPQ" />\n<meta name="msvalidate.01" content="F94E55AF6AFEC4FB09C52BBDBF8AA676" />\n' : ''}<meta name="theme-color" content="#F6EFE2">
<meta name="geo.region" content="IN-MH">
<meta name="geo.placename" content="Pune">
<meta property="og:site_name" content="Peak Pune">
<meta property="og:locale" content="en_IN">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE_URL}${ogImagePath(path)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(ogAlt(title))}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE_URL}${ogImagePath(path)}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/fraunces.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assetUrl('/tokens.css')}">
${map ? `<link rel="stylesheet" href="${assetUrl('/map/maplibre-gl.css')}">\n` : ''}
${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap bar"><a class="wordmark" href="/" aria-label="Peak Pune home">${mark}<span class="sr-only">Peak Pune</span></a><div class="nav-d"><nav aria-label="Main navigation">${nav}</nav></div><details class="join"><summary>Join</summary><div><a href="https://chat.whatsapp.com/BVTlwmhkqGU4WKzCsZFG95?s=cl&amp;p=i&amp;iam=2" target="_blank" rel="noopener noreferrer"><b>WhatsApp group</b><small>Chat with people</small></a><a href="https://whatsapp.com/channel/0029VbE00gNEVccC06aRUK2e" target="_blank" rel="noopener noreferrer"><b>WhatsApp channel</b><small>Updates only, no chatting</small></a><a href="https://www.reddit.com/r/punetonight/" target="_blank" rel="noopener noreferrer"><b>Reddit: r/punetonight</b><small>Discussions and plans</small></a></div></details><details class="menu"><summary>Menu</summary><nav class="nav-m" aria-label="Menu">${mnav}</nav></details></div></header>
<main id="main" class="wrap">
${trail}${main}
${ctaText}
</main>
<footer class="site-footer"><div class="wrap">
<div class="foot-brand"><a class="wordmark" href="/">${mark}<span class="sr-only">Peak Pune</span></a><p>Pune's unofficial guide to doing interesting shit. Less scrolling. More living.</p><p class="hash">#PeakPune · #OnlyInPune</p></div>
<nav aria-label="Sections"><h2>Explore</h2><a href="/places/">Places</a><a href="/map/">City map</a><a href="/koregaonpark/">Koregaon Park</a><a href="/eastpune/">East Pune</a><a href="/history/">History</a><a href="/markets/">Markets</a><a href="/sky/">Sky</a><a href="/outdoors/">Runs and treks</a><a href="/interests/">Interests</a><a href="/events/">Events</a><a href="/meetups/">Meetups</a><a href="/watch-together/">Watch together</a><a href="/PuneMetroguide/">Pune Metro guide</a><a href="/about/">About Peak Pune</a></nav>
<nav aria-label="Community"><h2>Join</h2><a href="https://chat.whatsapp.com/BVTlwmhkqGU4WKzCsZFG95?s=cl&amp;p=i&amp;iam=2" target="_blank" rel="noopener noreferrer">Join WhatsApp</a><a href="https://whatsapp.com/channel/0029VbE00gNEVccC06aRUK2e" target="_blank" rel="noopener noreferrer">Channel for updates</a><a href="https://www.reddit.com/r/punetonight/" target="_blank" rel="noopener noreferrer">r/punetonight</a><a class="ig-link" href="https://www.instagram.com/thepeakpune/" target="_blank" rel="noopener noreferrer" aria-label="IG - PeakPune (Peak Pune on Instagram)"><svg class="ig-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor"/></svg><span>IG - PeakPune</span></a></nav>
<nav aria-label="Powered by"><h2>Powered by</h2><a href="https://punerunners.com/" target="_blank" rel="noopener">PuneRunners.com</a><a href="https://punetrekkers.org/" target="_blank" rel="noopener">PuneTrekkers.org</a><a href="https://karawaan.in/" target="_blank" rel="noopener">karawaan.in</a><a href="/powered-by/">About these links</a><a href="/partner/">Work with Peak Pune</a></nav>
<p class="fine">Place and route details are sourced and dated. Event plans are platform listings, not organiser-confirmed. Map data © OpenStreetMap contributors.</p>
</div></footer>
<script type="module" src="${assetUrl('/app.js')}"></script>${plans ? `<script type="module" src="${assetUrl('/plans.js')}"></script>` : ''}${nowStrip ? `<script type="module" src="${assetUrl('/lib/pune-now.js')}"></script>` : ''}${map ? `<script defer src="${assetUrl('/map/maplibre-gl.js')}"></script><script type="module" src="${assetUrl(map === 'kp' ? '/koregaonpark/kp-map.js' : map === 'ep' ? '/eastpune/ep-map.js' : '/map/map.js')}"></script>` : ''}
<script data-goatcounter="https://peakpune.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</body>
</html>
`;
}

export function placeTitle(r) {
  const bits = [known(r.hours) && 'timings', r.price_note && 'prices', known(r.address) && 'address'].filter(Boolean);
  const where = known(r.neighbourhood) && !r.name.includes(r.neighbourhood) ? `, ${r.neighbourhood}` : '';
  return `${r.name}${where}, Pune${bits.length ? ': ' + bits.join(', ') : ''} | Peak Pune`;
}
export function placeDescription(r) {
  const extra = [known(r.hours) && `Hours: ${r.hours}.`, known(r.address) && `Address: ${r.address}.`].filter(Boolean).join(' ');
  return clip(`${r.summary} ${extra}`.trim(), 158);
}
export function placeLd(r) {
  const ld = { '@type': SCHEMA_TYPE[r.type] || 'Place', '@id': `${SITE_URL}/places/${slugOf(r)}/#place`, name: r.name, description: r.summary, url: `${SITE_URL}/places/${slugOf(r)}/` };
  const official = safeUrl(r.url_official);
  if (official) ld.sameAs = [official];
  ld.address = { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN', ...(known(r.address) ? { streetAddress: r.address } : {}) };
  if (typeof r.lat === 'number' && typeof r.lon === 'number') ld.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lon };
  return ld;
}

function placeMain(r, all = []) {
  const near = all.filter((x) => x !== r && known(r.neighbourhood) && x.neighbourhood === r.neighbourhood).slice(0, 3);
  const same = all.filter((x) => x !== r && x.type === r.type && !near.includes(x)).slice(0, 3 - Math.min(near.length, 3) + (near.length ? 0 : 0));
  const related = [...near, ...same].slice(0, 3);
  const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
  const links = [[safeUrl(r.url_deep), 'Open the source page'], [safeUrl(r.url_official), 'Official site']].filter(([u], i, a) => u && a.findIndex(([x]) => x === u) === i);
  const hasGeo = typeof r.lat === 'number';
  const mapLink = hasGeo ? ` <a href="/map/#${slugOf(r)}">See it on the Peak Pune map</a>` : '';
  const sources = r.sources.map(safeUrl).filter(Boolean).map((u) => `<li><a href="${esc(u)}" rel="noopener nofollow">${esc((new URL(u).hostname + new URL(u).pathname).replace(/^www\./, '').replace(/\/$/, ''))}</a></li>`).join('');
  return `<article class="place">
<div class="place-head"><div class="eyebrow">${esc(TYPE_SINGULAR[r.type] || r.type)}${known(r.neighbourhood) ? ' · ' + esc(r.neighbourhood) : ''}</div>
<h1>${esc(r.name)}</h1><p class="lede">${esc(r.summary)}</p>
${r.good_for.length ? `<ul class="tags" aria-label="Good for">${r.good_for.map((g) => `<li>${esc(g.replace(/-/g, ' '))}</li>`).join('')}</ul>` : ''}</div>
${r.stale_over_90_days ? '<p class="flag">The source for this listing is more than 90 days old. Check with the venue before you go.</p>' : ''}
<dl class="facts place-facts">
${row('Address', known(r.address) ? esc(r.address) : 'Not stated on the source page')}
${row('Hours', known(r.hours) ? esc(r.hours) : 'Not stated on the source page')}
${row('Prices', r.price_note ? esc(r.price_note) : '')}
${row('Area', known(r.neighbourhood) ? esc(r.neighbourhood) + ', Pune' : '')}
${row('Map', hasGeo ? `<a href="https://www.openstreetmap.org/?mlat=${r.lat}&amp;mlon=${r.lon}#map=17/${r.lat}/${r.lon}" rel="noopener nofollow">${r.lat}, ${r.lon}</a>${mapLink} <span class="note">© OpenStreetMap contributors</span>` : '')}
${row('Good to know', r.notes ? esc(r.notes) : '')}
</dl>
<p class="actions">${links.map(([u, l], i) => `<a class="${i ? 'chip' : 'primary'}" href="${esc(u)}" rel="noopener">${l}</a>`).join(' ')}</p>
<div class="provenance"><h2>Where this comes from</h2>
${staleNote(r.checked_at, 'venue')}<p>Listing reviewed against the linked sources on ${esc(r.checked_at)}. ${r.status === 'verified' ? 'Name, address and link are confirmed on the venue or organiser page.' : 'Some details are missing because the source page does not state them.'} Map coordinates, where shown, come from OpenStreetMap. Timings and prices change, so confirm with the venue.</p>
<ul class="sources">${sources}</ul></div>
</article>${related.length ? `<section class="section"><div class="section-head"><h2>${near.length ? `More in ${esc(r.neighbourhood)} and nearby picks` : `More ${esc((TYPE_LABEL[r.type] || 'places').toLowerCase())} in Pune`}</h2></div><div class="grid">${related.map(placeCard).join('')}</div></section>` : ''}`;
}

function placesIndex(rows) {
  const groups = Object.keys(TYPE_LABEL).map((t) => [t, rows.filter((r) => r.type === t)]).filter(([, rs]) => rs.length);
  const card = (r) => `<a class="card place-card" href="/places/${slugOf(r)}/"><div class="inner"><span class="eyebrow">${esc(known(r.neighbourhood) ? r.neighbourhood : 'Pune')}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p>${known(r.hours) ? `<p class="note">${esc(clip(r.hours, 70))}</p>` : ''}</div></a>`;
  return `<div class="hero hero-single"><div><div class="eyebrow">Explore Pune</div><h1>Places in Pune,<br>checked at the source.</h1>
<p class="lede">${rows.length} museums, bookstores, cafes, restaurants, temples and heritage spots across Pune. Addresses, timings and prices are copied from each venue's own page, with the date we checked.</p><p class="actions"><a class="chip" href="/map/">See them on the Pune map</a></p></div></div>
<nav class="chips jump" aria-label="Jump to a category">${groups.map(([t]) => `<a class="chip" href="#${t}">${TYPE_LABEL[t]}</a>`).join('')}</nav>
<section class="section"><div class="section-head"><h2>Which part of Pune are you in?</h2></div><nav class="chips" aria-label="Areas">${areasOf(rows).map(([a, x]) => `<a class="chip" href="/places/in/${AREA_SLUG(a)}/">${esc(a)} (${x.length})</a>`).join('')}</nav></section>
${groups.map(([t, rs]) => `<section class="section" id="${t}"><div class="section-head"><h2>${TYPE_LABEL[t]} in Pune</h2></div><div class="grid">${rs.map(card).join('')}</div></section>`).join('\n')}
<p class="note">Not a ranking. Listed places are the ones whose details we could confirm on an official page. Missing your favourite? It is probably waiting on a source.</p>
${faqSection(placesFaq(rows), 'Questions about places in Pune')}`;
}


// City map page (/map/): pins come only from published rows with OpenStreetMap coordinates.
export const MAP_PATH = '/map/';
export function mapPins(rows) {
  return rows
    .filter((r) => typeof r.lat === 'number' && typeof r.lon === 'number')
    .map((r) => ({ slug: slugOf(r), name: r.name, type: r.type, label: TYPE_SINGULAR[r.type] || r.type, neighbourhood: known(r.neighbourhood) ? r.neighbourhood : null, lat: r.lat, lon: r.lon, summary: r.summary, href: `/places/${slugOf(r)}/` }));
}
export function mapPage(rows) {
  const pins = mapPins(rows);
  const unpinned = rows.filter((r) => !pins.some((p) => p.slug === slugOf(r)));
  const filters = Object.keys(TYPE_LABEL)
    .filter((t) => pins.some((p) => p.type === t))
    .map((t) => `<button class="chip" type="button" data-type="${esc(t)}" aria-pressed="true">${esc(TYPE_LABEL[t])}</button>`)
    .join('');
  const list = Object.keys(TYPE_LABEL)
    .map((t) => [t, rows.filter((r) => r.type === t)])
    .filter(([, rs]) => rs.length)
    .map(([t, rs]) => `<section class="section"><div class="section-head"><h2>${TYPE_LABEL[t]}</h2></div><ul class="map-list">${rs.map((r) => `<li><a href="/places/${slugOf(r)}/">${esc(r.name)}</a>${known(r.neighbourhood) ? ` <span class="note">${esc(r.neighbourhood)}</span>` : ''}${typeof r.lat === 'number' ? '' : ' <span class="note">· not pinned</span>'}</li>`).join('')}</ul></section>`)
    .join('\n');
  const header = `<section class="section"><div class="section-head"><h2>Every place, pinned or not</h2><p>The same places the map shows, as plain links.${unpinned.length ? ` Not pinned yet: ${unpinned.map((r) => esc(r.name)).join(', ')}. OpenStreetMap has no confirmed spot for them, so they are not guessed.` : ''}</p></div></section>`;
  const main = read('site/pages/map.html')
    .replace('<!--MAP-COUNT-->', `${pins.length} of ${rows.length} places pinned${unpinned.length ? `; ${unpinned.length} listed only, below the map` : ''}. Tap a pin for the short version.`)
    .replace('<!--MAP-FILTERS-->', filters)
    .replace('<!--MAP-LIST-->', header + list)
    .replace('<!--MAP-DATA-->', JSON.stringify(pins).replace(/</g, '\\u003c'));
  return {
    main,
    title: `Pune map: ${pins.length} checked places on a detailed city map | Peak Pune`,
    description: `A detailed map of Pune with ${pins.length} source-checked places pinned: museums, bookstores, cafes, restaurants, temples, parks and heritage. Every pin opens its checked page. Map data © OpenStreetMap contributors.`,
  };
}

const LEVEL_CLASS = { Easy: 'lv-easy', Moderate: 'lv-mod', Challenging: 'lv-hard' };
const level = (d) => (d ? `<span class="level ${LEVEL_CLASS[d] || ''}">${esc(d)}</span>` : '');
const slugOut = (r) => r.id.replace(/^run-(trek-)?/, '');
const isTrek = (r) => r.type !== 'run-route';
export function outdoorTitle(r) {
  if (!isTrek(r)) return `${r.name}: ${r.distance_km} km running route in Pune | Peak Pune`;
  const bits = [r.distance_from_pune_km && `${r.distance_from_pune_km} km from Pune`, r.travel_time_text, r.difficulty].filter(Boolean);
  return `${r.name}${r.type === 'trek' ? ' trek' : ''} near Pune${bits.length ? ': ' + bits.join(', ') : ''} | Peak Pune`;
}
const outdoorCredit = (r) => (r.url_deep.includes('punerunners') ? ['PuneRunners Club', 'Open the route on PuneRunners'] : r.url_deep.includes('punetrekkers') ? ['Pune Trekkers', 'Read the full guide on Pune Trekkers'] : ['Pune district administration', 'Open the district page']);
function outdoorCard(r) {
  const meta = isTrek(r) ? [r.distance_from_pune_km && `${r.distance_from_pune_km} km from Pune`, r.travel_time_text].filter(Boolean).join(' · ') : `${r.distance_km} km loop`;
  return `<a class="card place-card" href="/outdoors/${slugOut(r)}/"><div class="inner"><span class="eyebrow">${esc(known(r.neighbourhood) ? r.neighbourhood : 'Pune')}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p><p class="meta">${level(r.difficulty)}<span>${esc(meta)}</span></p></div></a>`;
}
function outdoorMain(r, all = []) {
  const related = all.filter((x) => x !== r && isTrek(x) === isTrek(r)).sort((a, b) => (isTrek(r) ? Math.abs((a.distance_from_pune_km || 0) - (r.distance_from_pune_km || 0)) - Math.abs((b.distance_from_pune_km || 0) - (r.distance_from_pune_km || 0)) : Math.abs(a.distance_km - r.distance_km) - Math.abs(b.distance_km - r.distance_km))).slice(0, 3);
  const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
  const [who, label] = outdoorCredit(r);
  const hasGeo = typeof r.lat === 'number';
  return `<article class="place">
<div class="place-head"><div class="eyebrow">${isTrek(r) ? (r.scope === 'DAY_TRIP' ? 'Day trip from Pune' : 'Outdoors') : 'Running route'}${known(r.neighbourhood) ? ' · ' + esc(r.neighbourhood) : ''}</div>
<h1>${esc(r.name)}</h1><p class="lede">${esc(r.summary)}</p>${r.difficulty ? `<p class="meta">${level(r.difficulty)}</p>` : ''}</div>
<dl class="facts place-facts">
${row('Route length', r.distance_km ? `${r.distance_km} km` : '')}
${row('From Pune', r.distance_from_pune_km ? `About ${r.distance_from_pune_km} km${r.travel_time_text ? ', ' + esc(r.travel_time_text) : ''}` : '')}
${row('Time on trail', r.trek_time_text ? esc(r.trek_time_text) : '')}
${row('Starts at', r.start_point ? esc(r.start_point) : '')}
${row('Best months', r.best_months ? esc(r.best_months) : '')}
${row('Lit at night', r.lit_at_night === 'no' ? 'No. Unlit paths, daylight only' : !isTrek(r) ? 'Not checked by the source' : '')}
${row('Start point', hasGeo ? `<a href="https://www.openstreetmap.org/?mlat=${r.lat}&amp;mlon=${r.lon}#map=17/${r.lat}/${r.lon}" rel="noopener nofollow">${r.lat}, ${r.lon}</a>` : '')}
${row('Good to know', r.notes ? esc(r.notes) : '')}
</dl>
<p class="actions"><a class="primary" href="${esc(safeUrl(r.url_deep))}" rel="noopener">${label}</a></p>
<div class="provenance"><h2>Where this comes from</h2>
${staleNote(r.checked_at, 'venue')}<p>${isTrek(r) ? 'Distances, timings and difficulty are' : 'The route and its distance are'} as published by ${who}, read on ${esc(r.checked_at)}. Conditions change, and nobody at Peak Pune has walked or run this for you. Go early, go in company, and check with the source first.</p>
<ul class="sources">${r.sources.map(safeUrl).filter(Boolean).map((u) => `<li><a href="${esc(u)}" rel="noopener nofollow">${esc((new URL(u).hostname + new URL(u).pathname).replace(/^www\./, '').replace(/\/$/, ''))}</a></li>`).join('')}</ul></div>
</article>${related.length ? `<section class="section"><div class="section-head"><h2>${isTrek(r) ? 'Treks a similar drive away' : 'Loops of a similar length'}</h2></div><div class="grid">${related.map(outdoorCard).join('')}</div></section>` : ''}`;
}
function outdoorsIndex(rows) {
  const runs = rows.filter((r) => !isTrek(r)).sort((a, b) => a.distance_km - b.distance_km);
  const treks = rows.filter(isTrek).sort((a, b) => (a.distance_from_pune_km || 0) - (b.distance_from_pune_km || 0));
  return `<div class="hero"><div><div class="eyebrow">Runs, trails and day trips</div><h1>Get out.<br>Start early.</h1>
<p class="lede">${runs.length} mapped running loops inside the city and ${treks.length} treks and day trips in the Sahyadri, each with its distance from Pune and a link to the people who know the trail.</p></div>
<div class="sign">5:30 AM.<br>Tekdi.<br>No excuses.<small>ROUTES BY PUNERUNNERS · GUIDES BY PUNE TREKKERS</small></div></div>
<nav class="chips" aria-label="Collections">${COLLECTIONS.filter((c) => rows.filter(c.test).length >= 2).map((c) => `<a class="chip" href="/outdoors/${c.slug}/">${esc(c.h1)}</a>`).join('')}</nav>
<section class="section" id="runs"><div class="section-head"><h2>Where can I run in Pune?</h2><p>Plotted by PuneRunners Club on OpenStreetMap data. Mapped, not run-tested: footpaths, traffic and lighting are unchecked.</p></div><div class="grid">${runs.map(outdoorCard).join('')}</div></section>
<section class="section" id="treks"><div class="section-head"><h2>Which treks and day trips are near Pune?</h2><p>Nearest first. Distances and drive times are from Pune Trekkers' volunteer-written guides.</p></div><div class="grid">${treks.map(outdoorCard).join('')}</div></section>
${faqSection(outdoorsFaq(runs, treks), 'Questions about runs and treks')}`;
}
// Questions people ask, answered from the data on this site. The same text feeds the visible section and the FAQPage markup.
export function homeFaq(places, runs, treks) {
  const km = runs.map((r) => r.distance_km).filter((n) => typeof n === 'number');
  const range = km.length ? `, from ${Math.min(...km).toFixed(1)} to ${Math.max(...km).toFixed(1)} km` : '';
  const types = [...new Set(places.map((r) => TYPE_LABEL[r.type]).filter(Boolean))].map((t) => t.toLowerCase());
  return [
    ['What is Peak Pune?', ENTITY, '/about/', 'About Peak Pune'],
    ['Which places in Pune can I visit?', `Peak Pune lists ${places.length} places in Pune, including ${types.slice(0, 5).join(', ')}. Each page gives the address, timings and entry fee where the venue states them, with a link to the venue's own page and the date it was checked.`, '/places/', `All ${places.length} places`],
    ['Where can I run in Pune?', `Start with the ${runs.length} mapped city loops${range}, plotted by PuneRunners Club: ${runs.slice(0, 4).map((r) => r.name).join(', ')} and more. Peak Pune does not organise runs; PuneRunners Club does.`, '/outdoors/#runs', 'Running loops'],
    ['Which treks are near Pune?', `Peak Pune lists ${treks.length} treks and day trips with the distance from Pune and other details as published by the linked source. Peak Pune does not organise treks; groups such as Pune Trekkers and Karawaan do.`, '/outdoors/#treks', 'Treks and day trips'],
    ['What is on in Pune this week?', 'The radar board on the home page and the Events page show a short list, each pick linked to its source with a status. It is not an automatic feed, so some weeks it is short. Check the date, price and registration on the original listing before you go.', '/events/', 'Events'],
    ['How do I plan a Pune Metro journey?', 'The Pune Metro guide has a journey planner that tells you which line to take, where to change and the ticket fare. It works offline after one visit.', '/PuneMetroguide/', 'Pune Metro guide'],
  ];
}
const faqSection = (faq, heading = 'Quick answers about Pune') => `<section class="section faq" id="quick-answers"><div class="section-head"><h2>${esc(heading)}</h2></div><div class="faq-list">${faq.map(([q, a, href, label]) => `<div class="faq-item"><h3>${esc(q)}</h3><p>${esc(a)}${href ? ` <a href="${href}">${esc(label)}</a>` : ''}</p></div>`).join('')}</div></section>`;
const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}` : xs[0] || '');
// Places hub: every number and name below is read from the published rows.
export function placesFaq(rows) {
  const counts = Object.keys(TYPE_LABEL).map((t) => { const n = rows.filter((r) => r.type === t).length; return [(n === 1 && TYPE_SINGULAR[t] ? TYPE_SINGULAR[t] : TYPE_LABEL[t]).toLowerCase(), n]; }).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
  const all = areasOf(rows);
  const areas = all.filter(([, rs]) => rs.length === all[0][1].length);
  const date = rows.map((r) => r.checked_at).sort().at(-1);
  return [
    ['How many places in Pune does Peak Pune list?', `${rows.length} places: ${list(counts.map(([t, n]) => `${n} ${t}`))}. Each has its own page with the address and, where the venue states them, timings and entry fees.`],
    ['Which areas of Pune have the most listed places?', `${list(areas.map(([a, rs]) => `${a} (${rs.length})`))} have the most listings so far. Each area has its own page.`],
    ['Are the timings and entry fees up to date?', `They are copied from each venue's own page, and every listing shows the date it was checked (most recently ${date}). A listing checked more than 30 days ago carries a warning. Confirm with the venue before you visit.`],
    ['Is entry free when no price is shown?', 'No. A price appears only when the venue states one. When the venue does not state a fee, the page leaves it out and never shows it as free.'],
    ['Is this a ranking of the best places in Pune?', 'No. It is not a ranking. A place is listed when its details could be confirmed on an official page, so a well-known place may be missing because it is still waiting on a source.'],
  ];
}
// Outdoors hub: answers come from the route and trek rows; nothing here is a recommendation from experience.
export function outdoorsFaq(runs, treks) {
  const byKm = runs.filter((r) => typeof r.distance_km === 'number').sort((a, b) => a.distance_km - b.distance_km);
  const near = treks.filter((t) => t.distance_from_pune_km).sort((a, b) => a.distance_from_pune_km - b.distance_from_pune_km).slice(0, 3);
  const easy = treks.filter((t) => t.difficulty === 'Easy');
  const faq = [
    ['Where can I run in Pune?', `Peak Pune lists ${runs.length} mapped city loops plotted by PuneRunners Club: ${list(runs.map((r) => r.name))}.`],
  ];
  if (byKm.length > 1) faq.push(['Which are the shortest and longest running loops?', `The shortest is the ${byKm[0].name} at ${byKm[0].distance_km} km and the longest is the ${byKm.at(-1).name} at ${byKm.at(-1).distance_km} km.`]);
  if (near.length) faq.push(['Which treks are closest to Pune?', `The nearest listed are ${list(near.map((t) => `${t.name} (${t.distance_from_pune_km} km)`))}. Distances are from the linked source.`]);
  if (easy.length) faq.push(['Which treks near Pune are rated easy?', `${easy.length} of the ${treks.length} listed treks and day trips are rated Easy by their source: ${list(easy.map((t) => t.name))}. Ratings are the source's, and trails are harder in rain.`]);
  faq.push(['Does Peak Pune organise runs or treks?', 'No. Peak Pune does not organise runs, treks or trips. Running loops come from PuneRunners Club and trek guides from Pune Trekkers; join through their own sites.', '/powered-by/', 'Who organises what']);
  faq.push(['Have these routes been checked on the ground?', 'No. Running loops are mapped, not run-tested: footpaths, traffic and lighting are unchecked. Trek details are as published by the source on the date shown. Conditions change, so read the guide and go with company.']);
  return faq;
}
export const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const RADAR_PICKS = JSON.parse(read('scripts/radar-picks.json'));
const STATUS = { checked: ['SOURCE CHECKED', 'ok'], registration: ['CHECK REGISTRATION', 'warn'], pending: ['DATE BEING CHECKED', 'warn'] };
const FREQS = [['Crazy nights', '/events/', 'Underground gigs, techno, DJ sets, house parties, live music, comedy nights.'], ['Adventures', '/outdoors/#treks', 'Night treks, camping, waterfalls, road trips, offbeat trails, sunrise rides.'], ['Food chaos', '/interests/', 'Pop-ups, hidden food spots, midnight food scenes, food festivals, unusual experiences.'], ['Subcultures', '/interests/', 'Skateboarding, street art, photography walks, underground communities, creative gatherings.'], ['Weird + wonderful', '/events/', 'Experimental workshops, unusual popups, immersive experiences, quirky competitions.'], ['Spontaneous plans', '/meetups/', 'Pickup football, badminton groups, spontaneous meetups, open mics, community hangouts.']];
export const radarEvents = (now = Date.now()) => RADAR_PICKS.filter((p) => Date.parse(p.expires_at) >= now).map((p) => ({ id: `event-${p.id}`, name: p.name, summary: `${p.desc} ${p.date}, ${p.venue}.`, start_date: p.start_date, start: p.start, end: p.end, address: p.address, url_deep: p.url, checked_at: p.checked_at, status: p.status === 'checked' ? 'verified' : 'partial', note: p.ics_note || 'Picked by hand and checked against the linked listing on ' + p.checked_at + '. Dates, times and registration can change: confirm on the listing before you go.' }));
export function radarBoard(now = Date.now(), more = true) {
  const live = RADAR_PICKS.filter((p) => Date.parse(p.expires_at) >= now);
  const cards = live.map((p) => { const [label, tone] = STATUS[p.status]; return `<article class="radar-card" data-expires="${esc(p.expires_at)}"><p class="rmeta">${esc(p.territory)}<span class="rdate">${esc(p.date)}</span></p><h3>${esc(p.name)}</h3><p class="venue">${esc(p.venue)} · ${esc(p.price)}</p><p class="desc">${esc(p.desc)}</p>${p.caveat ? `<p class="caveat">${esc(p.caveat)}</p>` : ''}<p class="rcal"><a href="${icsPath({ id: `event-${p.id}` })}" download>Add to calendar (.ics)</a></p><div class="foot"><span class="pill ${tone}">${label}</span><a href="${esc(p.url)}" rel="noopener">${esc(p.link)} ↗</a></div></article>`; }).join('');
  return `<section class="section" id="radar" aria-label="What is on the radar"><div class="section-head"><h2>What is on the radar</h2><p>A short list for the next two weeks. Check dates and prices before you go.</p>${more ? '<a class="more" href="/events/">Events page</a>' : ''}</div>${live.length ? staleNote(live[0].checked_at, 'event') : ''}<div class="radar-cards">${cards}</div><p class="note radar-empty"${live.length ? ' hidden' : ''}>Nothing has passed the test yet this week. The scan continues.</p><p class="note">This is not an automatic feed, so the list can be short and can change.${live.length ? ` <a href="${ALL_ICS_PATH}" download>Add every pick to your calendar (.ics)</a>` : ''}</p></section>`;
}
function homeMain(places, outdoors) {
  const pick = (ids) => ids.map((id) => places.find((r) => r.id === id)).filter(Boolean);
  const feat = pick(['place-raja-dinkar-kelkar-museum', 'place-pagdandi-bookstore-coffee', 'place-marz-o-rin', 'place-joshis-museum-of-miniature-railways', 'place-shaniwar-wada', 'place-toit-pune']);
  const card = (r) => `<a class="card place-card" href="/places/${slugOf(r)}/"><div class="inner"><span class="eyebrow">${esc(TYPE_SINGULAR[r.type] || r.type)} · ${esc(known(r.neighbourhood) ? r.neighbourhood : 'Pune')}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p></div></a>`;
  const runs = outdoors.filter((r) => !isTrek(r)); const treks = outdoors.filter(isTrek);
  const near = [...treks].sort((a, b) => (a.distance_from_pune_km || 0) - (b.distance_from_pune_km || 0)).slice(0, 3);
  const tiles = [['Places', '/places/', `${places.length} checked at the source`], ['Runs and trails', '/outdoors/#runs', `${runs.length} mapped city loops`], ['Treks and day trips', '/outdoors/#treks', `${treks.length} with drive times`], ['Interests', '/interests/', 'Treks, books, food, history and more'], ['Events', '/events/', 'Plans, with sources'], ['Meetups', '/meetups/', 'Communities to join'], ['Pune Metro', '/PuneMetroguide/', 'Journey planner, works offline']];
  return `<div class="hero"><div><div class="eyebrow">Made in Pune, for Pune</div><h1>Pune's unofficial guide to doing <em>interesting shit.</em></h1>
<p class="lede">City radar for the interesting side of Pune. A short list, every pick linked to its source.</p>
<p class="actions"><a class="primary" href="#radar">See what is on the radar</a><a class="chip" href="/manifesto/">Read the manifesto</a></p></div>
<div class="sign" lang="mr">दुपारी १ ते ४<br>दुकान बंद<small lang="en">PEAK PUNE · THE CITY HAS ITS TIMINGS.</small></div></div>
<nav class="tiles" aria-label="Browse Pune">${tiles.map(([t, h, d]) => `<a class="category" href="${h}"><h3>${t}</h3><span>${d}</span></a>`).join('')}</nav>
<section class="section now" id="pune-now" aria-label="Pune right now"><div class="section-head"><h2>Pune right now</h2><p>Air quality, the next hour's temperature, and sun and moon times.</p></div><p class="now-summary" id="pune-now-summary">Loading current conditions for Pune...</p><div class="now-grid" aria-live="polite">${['Air quality', 'Next hour', 'Sun', 'Moon'].map((t) => `<div class="now-cell"><h3>${t}</h3><p class="now-value">...</p><p class="note">&nbsp;</p></div>`).join('')}</div><p class="note">Weather and air quality from <a href="https://open-meteo.com/" rel="noopener">Open-Meteo.com</a> (CC BY 4.0), loaded in your browser. AQI is the US scale. Moon times are worked out on your device and can be off by about 15 minutes.</p></section>
${radarBoard()}
<section class="section" aria-label="The six frequencies"><div class="section-head"><h2>The six frequencies</h2><p>What the radar scans for. If a plan does not fit one of these, it has to be genuinely strange to make the list.</p></div><div class="freq-grid">${FREQS.map(([t, h, d], i) => `<a class="freq-card" href="${h}"><p class="no">FRQ 0${i + 1}</p><h3>${t}</h3><p>${d}</p><span class="go" aria-hidden="true">See what fits</span></a>`).join('')}</div></section>
<section class="manifesto" id="manifesto"><p class="eyebrow">The manifesto</p><p class="lead">Pune is not boring. <em>You are just looking in the wrong places.</em></p><div class="body"><p>The best nights in this city never make the listings sites. They move through group chats and word of mouth. A gig in a basement. A food popup that exists for one Sunday. A trek that leaves while the city sleeps.</p><p>PeakPune is the radar. It exists to find the few things in Pune worth leaving the house for. It is not a directory. It will never list everything.</p><p>Plans on PeakPune have one home. Members can host their own plans; a member plan appears only after the host and the plan are approved. Anything hosted by PeakPune itself will be marked as an official PeakPune plan.</p></div><p class="end">LESS SCROLLING. MORE LIVING.</p></section>
<section class="section"><div class="section-head"><h2>Places, checked at the source</h2><p>Source-backed places. Hours and prices are shown only where checked; confirm details before visiting.</p><a class="more" href="/places/">All ${places.length} places</a></div><div class="grid">${feat.map(card).join('')}</div></section>
<section class="section band"><div class="section-head"><h2>Start early. The city is cooler.</h2><p>City loops from PuneRunners Club and trek guides from Pune Trekkers, sorted by how far you have to drive.</p><a class="more" href="/outdoors/">All runs and treks</a></div>
<div class="stats"><div><strong>${runs.length}</strong><span>running loops, 1.3 to 9.5 km</span></div><div><strong>${treks.length}</strong><span>treks and day trips</span></div><div><strong>${Math.min(...treks.map((t) => t.distance_from_pune_km).filter(Boolean))} km</strong><span>to the nearest trailhead</span></div></div>
<div class="grid">${near.map(outdoorCard).join('')}</div></section>
<section class="section"><div class="section-head"><h2>Powered by people who turn up</h2><p>Peak Pune does not organise runs, treks or trips. These three do.</p><a class="more" href="/powered-by/">How the links work</a></div>
<div class="grid">
<a class="card link-card pc-runners" href="https://punerunners.com/" rel="noopener"><div class="inner"><span class="eyebrow">Runs</span><h3>PuneRunners Club</h3><p>Free running community for every pace, with a race calendar and mapped routes.</p><span class="go">PuneRunners.com</span></div></a>
<a class="card link-card pc-trekkers" href="https://punetrekkers.org/" rel="noopener"><div class="inner"><span class="eyebrow">Treks</span><h3>Pune Trekkers</h3><p>Free, volunteer-run trekking group. Costs are split with no markup.</p><span class="go">PuneTrekkers.org</span></div></a>
<a class="card link-card pc-karawaan" href="https://karawaan.in/" rel="noopener"><div class="inner"><span class="eyebrow">Trips</span><h3>Karawaan</h3><p>Small-group treks, camping and trips built for people who come alone.</p><span class="go">karawaan.in</span></div></a>
</div></section>
${faqSection(homeFaq(places, runs, treks))}`;
}


const AREA_SLUG = (a) => a.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const placeCard = (r) => `<a class="card place-card" href="/places/${slugOf(r)}/"><div class="inner"><span class="eyebrow">${esc(TYPE_SINGULAR[r.type] || r.type)} · ${esc(known(r.neighbourhood) ? r.neighbourhood : 'Pune')}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p></div></a>`;
export function areasOf(rows) {
  const m = new Map();
  for (const r of rows) if (known(r.neighbourhood)) m.set(r.neighbourhood, [...(m.get(r.neighbourhood) || []), r]);
  return [...m].filter(([, rs]) => rs.length >= 2).sort((a, b) => b[1].length - a[1].length);
}
const MONSOON = ['June', 'July', 'August', 'September'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthsIn(range) {
  const m = /^([A-Z][a-z]+) to ([A-Z][a-z]+)$/.exec(range || ''); if (!m) return [];
  const a = MONTHS.indexOf(m[1]), b = MONTHS.indexOf(m[2]); if (a < 0 || b < 0) return [];
  const out = []; for (let i = a; ; i = (i + 1) % 12) { out.push(MONTHS[i]); if (i === b) break; } return out;
}
export const COLLECTIONS = [
  { slug: 'running-routes-in-pune', h1: 'Running routes in Pune', title: 'Running routes in Pune: mapped loops from 1.3 to 9.5 km | Peak Pune', blurb: 'Road and trail loops inside the city, plotted by PuneRunners Club on OpenStreetMap data. Mapped, not run-tested: check footpaths, traffic and lighting yourself.', test: (r) => r.type === 'run-route', sort: (a, b) => a.distance_km - b.distance_km },
  { slug: 'easy-treks-near-pune', h1: 'Easy treks near Pune', title: 'Easy treks near Pune for beginners, with distance and drive time | Peak Pune', blurb: 'Treks the Pune Trekkers guides rate Easy, nearest first. A good place to start if this is your first fort.', test: (r) => r.type === 'trek' && r.difficulty === 'Easy' },
  { slug: 'treks-within-70-km-of-pune', h1: 'Treks within 70 km of Pune', title: 'Treks within 70 km of Pune: short drives, real hills | Peak Pune', blurb: 'Trailheads the guides put at 70 km or less from Pune. Travel and walking times vary; plan your return before you leave.', test: (r) => r.type === 'trek' && r.distance_from_pune_km && r.distance_from_pune_km <= 70 },
  { slug: 'forts-near-pune', h1: 'Fort treks near Pune', title: 'Fort treks near Pune: distance, difficulty and start points | Peak Pune', blurb: 'Sahyadri forts with a guide from Pune Trekkers, sorted by how far you have to drive.', test: (r) => r.type === 'trek' && r.tags.includes('fort') },
  { slug: 'monsoon-treks-near-pune', h1: 'Monsoon treks near Pune', title: 'Monsoon treks near Pune: guides that list June to September | Peak Pune', blurb: 'Treks whose best months, per the Pune Trekkers guide, include June to September. Trails are slippery in rain: read the guide and go with company.', test: (r) => r.type === 'trek' && monthsIn(r.best_months).some((m) => MONSOON.includes(m)) },
];
const byDrive = (a, b) => (a.distance_from_pune_km || 0) - (b.distance_from_pune_km || 0);
function eventsBlock(events) {
  if (!events.length) return '<section class="section"><h2>No current organiser listings</h2><p>Only source-checked plans will appear here.</p></section>';
  const dated = events.filter((e) => e.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const recurring = events.filter((e) => e.recurrence);
  const day = (d) => new Date(d + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const card = (e) => `<article class="card event-card" data-expires="${esc(e.expires_at || '')}"><div class="inner"><span class="eyebrow">${e.start_date ? esc(day(e.start_date)) : 'Recurring'}</span><h3>${esc(e.name)}</h3><p>${esc(e.summary)}</p><p class="meta"><span>${esc([known(e.organiser) ? e.organiser : null, known(e.neighbourhood) ? e.neighbourhood : null, e.price_note].filter(Boolean).join(' · '))}</span></p>${e.recurrence ? `<p class="note">${esc(e.recurrence)}</p>` : ''}<p class="plan-actions"><a class="chip" href="${esc(safeUrl(e.url_deep))}" rel="noopener">${e.status === 'verified' ? 'Organiser page' : 'Source page'}</a>${e.linked_id ? `<a class="chip" href="/places/${e.linked_id.replace(/^place-/, '')}/">About the venue</a>` : ''}</p>${when(e) ? `<p class="plan-actions cal" aria-label="Add ${esc(e.name)} to your calendar"><a class="chip" href="${esc(googleUrl(e, safeUrl))}" target="_blank" rel="noopener">Add to Google Calendar</a><a class="chip" href="${icsPath(e)}" download>Download .ics</a></p>` : ''}</div></article>`;
  return `<section class="section" id="organisers"><div class="section-head"><h2>More source-listed plans</h2><p>Races, treks and camps read from the linked source pages on ${esc(events[0].checked_at)}. Dated cards disappear once the day has passed. <a href="${ALL_ICS_PATH}" download>Add every dated listing to your calendar (.ics)</a>.</p></div>${staleNote(events[0].checked_at, 'event')}<div class="grid">${dated.map(card).join('')}</div></section>
<section class="section" id="every-day"><div class="section-head"><h2>Recurring venue listings</h2><p>Schedules published by the venue. Confirm current timings before going.</p></div><div class="grid">${recurring.map(card).join('')}</div></section>`;
}
export function eventLd(e) {
  if (!e.start_date || e.status !== 'verified') return null;
  const ld = { '@type': 'Event', name: e.name, description: e.summary, startDate: e.start || e.start_date, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', url: safeUrl(e.url_deep), location: { '@type': 'Place', name: known(e.neighbourhood) ? `${e.neighbourhood}, Pune` : 'Pune', address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN', ...(known(e.address) ? { streetAddress: e.address } : {}) } } };
  if (e.end) ld.endDate = e.end;
  if (known(e.organiser)) ld.organizer = { '@type': 'Organization', name: e.organiser, url: safeUrl(e.url_official) || undefined };
  return ld;
}


const STATE = { active: ['Active', 'lv-easy'], DORMANT: ['Dormant', 'lv-hard'], UNKNOWN: ['Activity not confirmed', ''] };
const SISTER_IDS = ['meetup-punerunners-club', 'meetup-pune-trekkers', 'meetup-karawaan-community', 'meetup-morning-pedal-punerunners'];
function meetupsBlock(allRows) {
  const rows = SISTER_IDS.map((id) => allRows.find((m) => m.id === id)).filter(Boolean);
  if (!rows.length) return '<section class="section"><h2>No current communities listed</h2><p>Joining links and activity need checking before publication.</p></section>';
  const card = (m) => `<article class="card"><div class="inner"><span class="eyebrow">${esc(m.tags.slice(0, 2).join(' · '))}${known(m.neighbourhood) ? ' · ' + esc(m.neighbourhood) : ''}</span><h3>${esc(m.name)}</h3><p>${esc(m.summary)}</p><p class="note">${esc(m.schedule_text)}</p><p class="meta"><span class="level ${STATE[m.activity_state][1]}">${STATE[m.activity_state][0]}</span>${m.cost_note ? `<span>${esc(m.cost_note)}</span>` : ''}</p><p class="plan-actions"><a class="chip" href="${esc(safeUrl(m.join_url))}" rel="noopener">How to join</a>${m.linked_id ? `<a class="chip" href="/places/${m.linked_id.replace(/^place-/, '')}/">About the venue</a>` : ''}</p></div></article>`;
  const ID_STYLE = `<style>
@font-face{font-family:'Anton';src:url('/fonts/anton.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap}
.card-id .inner{background:#FBF4E6}
.id-row{display:flex;align-items:center;gap:16px}
.id-logo{width:64px;height:64px;border-radius:50%;border:2px solid var(--rim);flex:none}
.card-id .id-eyebrow{color:#F28C28}
.card-id .id-name{font-family:'Anton',var(--display);font-weight:400;color:#7A1F2B;letter-spacing:.01em}
.card-id .id-join{background:#7A1F2B;color:#FBF4E6}
</style>`;
  const idCard = (m) => `<article class="card card-id"><div class="inner"><div class="id-row"><img class="id-logo" src="${esc(m.logo)}" alt="${esc(m.name)} logo" width="64" height="64" loading="lazy"><div><span class="eyebrow id-eyebrow">${esc(m.tags.slice(0, 2).join(' \u00b7 '))}</span><h3 class="id-name">${esc(m.name)}</h3></div></div><p>A free cycling community by PuneRunners.</p><p class="plan-actions"><a class="chip id-join" href="${esc(safeUrl(m.join_url))}" rel="noopener">How to join</a></p></div></article>`;
  const featured = rows.filter((m) => m.activity_state === 'active' || m.identity_only);
  const render = (m) => (m.identity_only ? idCard(m) : card(m));
  const rest = rows.filter((m) => m.activity_state !== 'active' && !m.identity_only);
  return `${featured.some((m) => m.identity_only) ? ID_STYLE : ''}<section class="section"><div class="section-head"><h2>Communities to join</h2><p>${featured.length} Pune groups with a public joining page. Rules, costs and group links live on their own sites.</p></div><div class="grid">${featured.map(render).join('')}</div></section>
<section class="section"><h2>Add your community</h2><p>Run a Pune community and want it listed here? Reach out to the Peak Pune admins in the <a href="https://chat.whatsapp.com/BVTlwmhkqGU4WKzCsZFG95?s=cl&amp;p=i&amp;iam=2" target="_blank" rel="noopener noreferrer">Peak Pune WhatsApp group</a>.</p></section>
${rest.length ? `<section class="section"><h2>Other source-checked communities</h2><div class="grid">${rest.map(card).join('')}</div></section>` : ''}`;
}
function momentsBlock(rows) {
  if (!rows.length) return '<p class="note">No moments are published yet. Reader submissions remain closed.</p>';
  return rows.map((m) => `<a class="card place-card" href="/${m.linked_id.startsWith('place-') ? 'places/' + m.linked_id.replace(/^place-/, '') : 'outdoors/' + m.linked_id.replace(/^run-(trek-)?/, '')}/"><div class="inner"><span class="eyebrow">${esc(m.best_time)}</span><h3>${esc(m.caption)}</h3><p class="note">${esc(m.name)} · ${esc(m.season)}</p></div></a>`).join('');
}

const ERA_LABELS = { ancient: ['Ancient Pune', 'प्राचीन काळ'], bhosale: ['The Bhosale era', 'भोसल्यांचा काळ'], peshwa: ['The Peshwa era', 'पेशवेकाळ'], british: ['British Pune', 'ब्रिटिश काळ'], modern: ['Modern Pune', 'आधुनिक काळ'] };
const srcChips = (sources) => `<nav class="chips" aria-label="Sources">${sources.map((s) => { const u = safeUrl(s.url); return u ? `<a class="chip" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>` : ''; }).join('')}</nav>`;
function historyBlock(rows) {
  if (!rows.length) return '<p class="note">No history entries are published yet.</p>';
  return Object.keys(ERA_LABELS).map((era) => {
    const rs = rows.filter((r) => r.era === era);
    if (!rs.length) return '';
    return `<section class="section" id="${era}"><div class="section-head"><h2>${ERA_LABELS[era][0]}</h2><p lang="mr">${ERA_LABELS[era][1]}</p></div><div class="grid">${rs.map((r) => `<article class="card"><div class="inner"><span class="eyebrow">${esc(r.date_label)}</span><h3>${esc(r.title_en)}</h3><p lang="mr"><strong>${esc(r.title_mr)}</strong></p><p>${esc(r.summary_en)}</p><p lang="mr" class="note">${esc(r.summary_mr)}</p>${srcChips(r.sources)}</div></article>`).join('')}</div></section>`;
  }).join('');
}
const shopCard = (s) => `<article class="card"><div class="inner"><span class="eyebrow">${esc(s.area)}${s.since ? ` · since ${esc(s.since)}` : ''}</span><h3>${esc(s.name)}</h3><p><strong>${esc(s.known_for)}</strong></p><p class="note">${esc(s.note)}</p>${srcChips(s.sources)}</div></article>`;
const areaCard = (a) => `<article class="card"><div class="inner"><span class="eyebrow">${esc(a.area)}</span><h3>${esc(a.name)}</h3><p><strong>Best for: ${esc(a.best_for)}</strong></p><p>${esc(a.known_for)}</p><p class="note">${esc(a.notes)}</p>${srcChips(a.sources)}</div></article>`;

const STATIC = [
  { file: 'history', path: '/history/', fill: 'history', title: 'History of Pune: a sourced timeline in English and Marathi | Peak Pune', description: 'A starter timeline of Pune, from stone tools on the Mutha to the modern city. Every entry is checked against a named source and written in English and Marathi.', crumbs: [['History', '/history/']] },
  { file: 'markets', path: '/markets/', fill: 'markets', title: 'Where Pune shops: market areas and standout shops | Peak Pune', description: 'Pune shopping areas from Laxmi Road to FC Road, plus standout retail houses and food institutions, each with sources checked on 14 November 2026.', crumbs: [['Markets', '/markets/']] },
  { file: 'sky', path: '/sky/', title: 'Pune sky calendar: moon, eclipses, planets, meteors | Peak Pune', description: 'What to look up for in Pune over the next 3 months: moon phases, eclipses, planets, meteor showers and bright stars, calculated for Pune with times in IST.', crumbs: [['Sky', '/sky/']] },
  { file: 'meetups', path: '/meetups/', fill: 'meetups', ctaShort: true, title: 'Pune communities: running, trekking, travel and cycling | Peak Pune', description: 'Pune communities to join: PuneRunners, Pune Trekkers, Karawaan and Morning Pedal, each with a public joining page.', crumbs: [['Meetups', '/meetups/']] },
  { file: 'manifesto', path: '/manifesto/', title: 'The Peak Pune manifesto: less scrolling, more living | Peak Pune', description: 'The Peak Pune manifesto: Pune is not boring, you are just looking in the wrong places. Why the radar exists, in our own words.', crumbs: [['Manifesto', '/manifesto/']] },
  { file: 'watch-together', path: '/watch-together/', ctaShort: true, title: 'Watch together: pool up with people across Pune for the same film | Peak Pune', description: 'Start or join a small pool for a film in Pune. See the headcount for each show, and book your own tickets on District. A guide, not a booking service.', crumbs: [['Watch together', '/watch-together/']] },
  { file: 'partner', path: '/partner/', ctaShort: true, title: 'Work with Peak Pune: cafes, venues, organisers and communities | Peak Pune', description: 'Run a cafe, venue, event or community in Pune? Send Peak Pune a short note. Peak Pune is a radar, not a directory, and cannot promise a listing.', crumbs: [['Work with Peak Pune', '/partner/']] },
  { file: 'about', path: '/about/', ldType: 'AboutPage', title: 'About Peak Pune: who it is for and how listings are checked', description: 'Peak Pune is a Pune discovery site for source-checked places, events, runs, treks and meetups. How listings are sourced and checked, who organises what, and how to report a mistake.', crumbs: [['About', '/about/']] },
  { file: 'moments', path: '/moments/', fill: 'moments', noindex: true, title: 'Peak Pune Moments | Peak Pune', description: 'Genuine Pune moments will appear here after review. Reader submissions are not open yet.', crumbs: [['Moments', '/moments/']] },
  { file: 'links', path: '/links/', bare: true, title: 'Peak Pune links: Instagram, WhatsApp, events, places, communities', description: 'Every Peak Pune link in one place: Instagram, the WhatsApp group and channel, what is on in Pune, places to visit, communities to join and the community list.' },
  { file: 'women', path: '/women/', ctaShort: true, title: 'Women in Pune: find your people and get offline | Peak Pune', description: 'A page for women in Pune who want to find their people, try new things and get offline, at their own pace. How Peak Pune helps and what to look for.', crumbs: [['For women', '/women/']] },
  { file: 'communities', path: '/groups/', bare: true, title: 'Pune community WhatsApp channels and groups | Peak Pune', description: 'Pune community directories in one place: PuneRunners, Pune Trekkers and Karawaan WhatsApp channels, plus community group chats for trekking, travel, protein recipes, cycling, corporate running and referrals. Run by their own admins.' },
  { file: 'peakpune-events', path: '/peakpune-events/', noindex: true, title: 'Official Peak Pune events | Peak Pune', description: 'Events hosted by Peak Pune itself. None are announced yet.', crumbs: [['Peak Pune events', '/peakpune-events/']] },
  { file: 'powered-by', path: '/powered-by/', ctaShort: true, title: 'Powered by PuneRunners, Pune Trekkers and Karawaan | Peak Pune', description: 'The three Pune groups behind Peak Pune runs, treks and trips: PuneRunners Club, Pune Trekkers and Karawaan. What each does and where to join.', crumbs: [['Powered by', '/powered-by/']] },
];

// AI and answer-engine crawlers are welcome (owner's decision, 16 Nov 2026), and are named so that is explicit.
// A crawler that matches a named group ignores the "*" group, so the /backend rule is repeated for them.
export const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent', 'CCBot', 'Bytespider', 'cohere-ai', 'MistralAI-User', 'DuckAssistBot'];
export const SEARCH_CRAWLERS = ['DuckDuckBot'];
export function robotsTxt() {
  const group = (comment, agents) => `# ${comment}\n${agents.map((a) => `User-agent: ${a}`).join('\n')}\nAllow: /\nDisallow: /backend\n`;
  return `User-agent: *\nAllow: /\nDisallow: /backend\n\n${group('AI assistants, AI search and AI training crawlers: allowed', AI_CRAWLERS)}\n${group('Search engines named explicitly', SEARCH_CRAWLERS)}${INDEXING ? `\nSitemap: ${SITE_URL}/sitemap.xml\n` : ''}`;
}

export function build({ outDir = join(root, 'public'), log = () => {}, dryRun = false, onPage = /** @type {(path: string, html: string) => void} */ (() => {}) } = {}) {
  const rows = publishRows(JSON.parse(read('data/batch-1-places/places.json'))).filter((r) => r.scope === 'CORE');
  const outdoors = publishRows(JSON.parse(read('data/batch-2-outdoors/outdoors.json')));
  const out = (path, html) => { onPage(path, withBase(html)); if (dryRun) return; const f = join(outDir, path.replace(/^\//, ''), path.endsWith('/') ? 'index.html' : ''); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, withBase(html)); };
  const urls = []; // lastmod omitted on purpose: checked_at is a review date, not a content-change date
  const website = { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, url: `${SITE_URL}/`, name: 'Peak Pune', alternateName: 'PeakPune', inLanguage: 'en-IN', publisher: { '@id': `${SITE_URL}/#org` } };
  out('/', page({ path: '/', title: 'Peak Pune | Pune\'s unofficial guide to doing interesting shit', description: 'City radar for the interesting side of Pune. A short list of picks, each linked to its source, plus sourced places, running loops, treks and the Pune Metro guide.', main: homeMain(rows, outdoors), ld: [website, faqLd(homeFaq(rows, outdoors.filter((r) => !isTrek(r)), outdoors.filter(isTrek)))], nowStrip: true }));
  urls.push(['/', null]);
  for (const p of STATIC) {
    let main = read(`site/pages/${p.file}.html`);
    if (p.fill === 'meetups') main = main.replace('<!--MEETUPS-->', meetupsBlock(publishRows(JSON.parse(read('data/batch-4-meetups/meetups.json')))));
    if (p.fill === 'history') main = main.replace('<!--HISTORY-->', historyBlock(publishRows(JSON.parse(read('data/batch-6-history/history.json')))));
    if (p.fill === 'markets') { const m = JSON.parse(read('data/batch-7-shopping/shopping.json')); main = main.replace('<!--AREAS-->', publishRows(m.areas).map(areaCard).join('')).replace('<!--RETAIL-->', publishRows(m.shops).filter((s) => s.category === 'retail').map(shopCard).join('')).replace('<!--FOOD-->', publishRows(m.shops).filter((s) => s.category === 'food').map(shopCard).join('')); }
    if (p.fill === 'moments') main = main.replace('<!--MOMENTS-->', momentsBlock(publishRows(JSON.parse(read('data/batch-5-moments-reference/moments.json')))));
    if (p.bare) main = main.replace('<!--MARK-->', mark);
    out(p.path, bareStrip(p.bare, page({ ...p, ctaText: p.bare ? '' : p.ctaShort ? ctaShort : cta, main, ld: [{ '@type': p.ldType || 'WebPage', '@id': SITE_URL + p.path, url: SITE_URL + p.path, name: p.title, description: p.description, isPartOf: { '@id': `${SITE_URL}/#site` }, ...(p.ldType === 'AboutPage' ? { about: { '@id': `${SITE_URL}/#org` } } : {}) }] })));
    // Pages with nothing published yet stay out of the sitemap.
    if (!p.noindex) urls.push([p.path, null]);
  }
  const placesDir = join(outDir, 'places');
  if (!dryRun && existsSync(placesDir)) rmSync(placesDir, { recursive: true });
  out('/places/', page({ path: '/places/', title: 'Places to visit in Pune: museums, bookstores, cafes and heritage | Peak Pune', description: `${rows.length} places in Pune with addresses, timings and entry fees checked on the venue's own page: museums, bookstores, cafes, restaurants, temples and heritage sites.`, main: placesIndex(rows), crumbs: [['Places', '/places/']], ld: [faqLd(placesFaq(rows)), { '@type': 'ItemList', name: 'Places in Pune', numberOfItems: rows.length, itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/places/${slugOf(r)}/` })) }] }));
  urls.push(['/places/', null]);
  for (const r of rows) {
    const path = `/places/${slugOf(r)}/`;
    out(path, page({ path, current: '/places/', title: placeTitle(r), description: placeDescription(r), main: placeMain(r, rows), crumbs: [['Places', '/places/'], [r.name, path]], ld: [placeLd(r)], ogType: 'article' }));
    urls.push([path, null]);
  }
  const buildNow = Date.now();
  const events = radarEvents(buildNow);
  out('/events/', page({ path: '/events/', title: 'What is on in Pune: a short hand-checked list | Peak Pune', description: 'A short list of things worth leaving the house for in Pune, picked by hand. Every pick links to its source and shows whether the date or registration is confirmed.', crumbs: [['Events', '/events/']], main: read('site/pages/events.html').replace('<!--RADAR-->', radarBoard(buildNow, false)).replace('<!--ORGANISER-EVENTS-->', ''), ld: [{ '@type': 'CollectionPage', '@id': `${SITE_URL}/events/`, url: `${SITE_URL}/events/`, name: 'Events in Pune', isPartOf: { '@id': `${SITE_URL}/#site` } }] }));
  urls.push(['/events/', null]);
  out('/birthdays/', page({ path: '/birthdays/', title: 'Birthdays in the Peak Pune community: upcoming birthdays and member plans | Peak Pune', description: 'See who in the Peak Pune community has a birthday coming up and what they would enjoy. Celebrations are member plans, made and hosted by members, not organised by Peak Pune.', crumbs: [['Birthdays', '/birthdays/']], main: read('site/pages/birthdays.html'), ld: [{ '@type': 'CollectionPage', '@id': `${SITE_URL}/birthdays/`, url: `${SITE_URL}/birthdays/`, name: 'Birthdays in the Peak Pune community', isPartOf: { '@id': `${SITE_URL}/#site` } }] }));
  urls.push(['/birthdays/', null]);
  if (!dryRun) {
    const calDir = join(outDir, 'calendar');
    rmSync(calDir, { recursive: true, force: true });
    mkdirSync(calDir, { recursive: true });
    const dated = events.filter((e) => when(e));
    for (const e of dated) writeFileSync(join(outDir, icsPath(e)), ics([e], safeUrl, e.name));
    writeFileSync(join(outDir, ALL_ICS_PATH), ics(dated, safeUrl));
  }
  for (const [area, rs] of areasOf(rows)) {
    const path = `/places/in/${AREA_SLUG(area)}/`;
    out(path, page({ path, current: '/places/', title: `Places to visit in ${area}, Pune: ${rs.length} checked spots | Peak Pune`, description: clip(`${rs.length} places in ${area}, Pune with addresses and timings from their own pages: ${rs.map((r) => r.name).join(', ')}.`, 158), crumbs: [['Places', '/places/'], [area, path]], main: `<div class="hero hero-single"><div><div class="eyebrow">Places by area</div><h1>${esc(area)}</h1><p class="lede">${rs.length} places in ${esc(area)}, Pune, each with details copied from its own page and the date we checked.</p></div></div><section class="section"><div class="grid">${rs.map(placeCard).join('')}</div></section><section class="section"><div class="section-head"><h2>Other areas</h2></div><nav class="chips" aria-label="Areas">${areasOf(rows).filter(([a]) => a !== area).map(([a, x]) => `<a class="chip" href="/places/in/${AREA_SLUG(a)}/">${esc(a)} (${x.length})</a>`).join('')}</nav></section>`, ld: [{ '@type': 'ItemList', name: `Places in ${area}, Pune`, numberOfItems: rs.length, itemListElement: rs.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/places/${slugOf(r)}/` })) }] }));
    urls.push([path, null]);
  }
  // City map: every published place with OpenStreetMap coordinates pinned; the page's plain list carries all of them.
  const map = mapPage(rows);
  out(MAP_PATH, page({ path: MAP_PATH, map: true, title: map.title, description: map.description, crumbs: [['Map', MAP_PATH]], main: map.main, ld: [{ '@type': 'Map', '@id': SITE_URL + MAP_PATH, url: SITE_URL + MAP_PATH, name: 'Peak Pune city map', description: map.description, isPartOf: { '@id': `${SITE_URL}/#site` } }] }));
  urls.push([MAP_PATH, null]);
  const kp = kpMain();
  out(KP_PATH, page({ path: KP_PATH, map: 'kp', title: KP_TITLE, description: KP_DESCRIPTION, crumbs: [['Koregaon Park', KP_PATH]], main: kp.main, ld: kpLd(SITE_URL, kp.pins) }));
  urls.push([KP_PATH, null]);
  const ep = epMain();
  out(EP_PATH, page({ path: EP_PATH, map: 'ep', title: EP_TITLE, description: EP_DESCRIPTION, crumbs: [['East Pune', EP_PATH]], main: ep.main, ld: epLd(SITE_URL, ep.pins) }));
  urls.push([EP_PATH, null]);
  const outDir2 = join(outDir, 'outdoors');
  if (!dryRun && existsSync(outDir2)) rmSync(outDir2, { recursive: true });
  out('/outdoors/', page({ path: '/outdoors/', title: 'Running routes in Pune and treks near Pune, with distances | Peak Pune', description: `${outdoors.filter((r) => !isTrek(r)).length} running loops inside Pune and ${outdoors.filter(isTrek).length} treks and day trips nearby, with distance from Pune, drive time and difficulty from PuneRunners and Pune Trekkers.`, main: outdoorsIndex(outdoors), crumbs: [['Outdoors', '/outdoors/']], ld: [faqLd(outdoorsFaq(outdoors.filter((r) => !isTrek(r)), outdoors.filter(isTrek))), { '@type': 'ItemList', name: 'Runs and treks in and near Pune', numberOfItems: outdoors.length, itemListElement: outdoors.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/outdoors/${slugOut(r)}/` })) }] }));
  urls.push(['/outdoors/', null]);
  for (const r of outdoors) {
    const path = `/outdoors/${slugOut(r)}/`;
    const ld = { '@type': isTrek(r) ? 'TouristAttraction' : 'Place', '@id': `${SITE_URL}${path}#place`, name: r.name, description: r.summary, url: SITE_URL + path, ...(typeof r.lat === 'number' ? { geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lon } } : {}) };
    out(path, page({ path, current: '/outdoors/', title: outdoorTitle(r), description: clip(`${r.summary} ${isTrek(r) && r.distance_from_pune_km ? `About ${r.distance_from_pune_km} km from Pune${r.travel_time_text ? ', ' + r.travel_time_text : ''}.` : ''}`.trim(), 158), main: outdoorMain(r, outdoors), crumbs: [['Outdoors', '/outdoors/'], [r.name, path]], ld: [ld], ogType: 'article' }));
    urls.push([path, null]);
  }
  for (const c of COLLECTIONS) {
    const rs = outdoors.filter(c.test).sort(c.sort || byDrive); if (rs.length < 2) continue;
    const path = `/outdoors/${c.slug}/`;
    out(path, page({ path, current: '/outdoors/', title: c.title, description: clip(`${rs.length} ${c.h1.toLowerCase()}: ${rs.map((r) => r.name).join(', ')}. ${c.blurb}`, 158), crumbs: [['Outdoors', '/outdoors/'], [c.h1, path]], main: `<div class="hero hero-single"><div><div class="eyebrow">Outdoors · ${rs.length} listed</div><h1>${esc(c.h1)}</h1><p class="lede">${esc(c.blurb)}</p></div></div><section class="section"><div class="grid">${rs.map(outdoorCard).join('')}</div></section><section class="section"><div class="section-head"><h2>More ways to get out</h2></div><nav class="chips" aria-label="Collections">${COLLECTIONS.filter((x) => x !== c && outdoors.filter(x.test).length >= 2).map((x) => `<a class="chip" href="/outdoors/${x.slug}/">${esc(x.h1)}</a>`).join('')}</nav></section>`, ld: [{ '@type': 'ItemList', name: c.h1, numberOfItems: rs.length, itemListElement: rs.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/outdoors/${slugOut(r)}/` })) }] }));
    urls.push([path, null]);
  }
  // Discovery by Metro stop and by interest. Both read only audited rows; see scripts/discover-pages.mjs.
  const meetupRows = publishRows(JSON.parse(read('data/batch-4-meetups/meetups.json')));
  const hrefOf = (r) => safeUrl(r.url_deep) || safeUrl(r.url_official) || safeUrl(r.join_url) || '/events/';
  const listings = [...events, ...meetupRows].map((r) => ({ name: r.name, neighbourhood: r.neighbourhood, href: hrefOf(r) }));
  const stops = buildStops({ root, esc, places: rows, listings, TYPE_SINGULAR, slugOf });
  out(STOPS_PATH, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pune Metro stops moved | Peak Pune</title><meta name="robots" content="noindex"><link rel="canonical" href="${SITE_URL}${GUIDE_PATH}#near-stations"><meta http-equiv="refresh" content="0; url=${GUIDE_PATH}#near-stations"></head><body><p>Places near each Metro station are now part of the <a href="${GUIDE_PATH}#near-stations">Pune Metro guide</a>.</p></body></html>`);
  const interests = buildInterests({ esc, groups: [
    { label: 'Place', rows, href: (r) => `/places/${slugOf(r)}/` },
    { label: 'Run or trek', labelOf: (r) => (isTrek(r) ? 'Trek' : 'Run'), rows: outdoors, href: (r) => `/outdoors/${slugOut(r)}/` },
    { label: 'Event', rows: events, href: hrefOf },
    { label: 'Community', rows: meetupRows, href: hrefOf },
  ] });
  out(INTERESTS_PATH, page({ path: INTERESTS_PATH, title: 'Things to do in Pune by interest: treks, running, books, history, food | Peak Pune', description: `Pune listings grouped by hobby: ${interests.shelves.map(([t]) => t.toLowerCase()).join(', ')}. Every card opens its own checked page.`, crumbs: [['Interests', INTERESTS_PATH]], main: interests.main, ld: [{ '@type': 'WebPage', '@id': SITE_URL + INTERESTS_PATH, url: SITE_URL + INTERESTS_PATH, name: 'Pune by interest', isPartOf: { '@id': `${SITE_URL}/#site` } }] }));
  urls.push([INTERESTS_PATH, null]);
  // Pune Metro guide: an Astro route like the rest. Its hashed assets and service worker are written beside it
  // (and reach dist through Astro's publicDir); they are skipped in dryRun, which only enumerates routes.
  const metro = buildMetroGuide({ ctx: { esc, page, assetUrl, BASE, SITE_URL, nearby: stops.section } });
  if (!dryRun) writeMetroAssets(join(outDir, 'PuneMetroguide'), metro.files);
  out(GUIDE_PATH, metro.html);
  urls.push([GUIDE_PATH, null]);
  out('/404.html', page({ path: '/404.html', title: 'Page not found | Peak Pune', description: 'This page is closed 1 to 4, or possibly forever.', main: '<div class="hero hero-single"><div><div class="eyebrow">404</div><h1>Closed. Not just 1 to 4.</h1><p>This page does not exist. The rest of Pune does.</p><p class="actions"><a class="primary" href="/">Back to Explore</a> <a class="chip" href="/places/">Browse places</a></p></div></div>' }).replace(`content="${ROBOTS}"`, 'content="noindex"'));
  if (!dryRun) {
  writeFileSync(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, d]) => `<url><loc>${esc(SITE_URL + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(outDir, 'robots.txt'), robotsTxt());

  writeFileSync(join(outDir, 'site.webmanifest'), JSON.stringify({ name: 'Peak Pune', short_name: 'Peak Pune', start_url: '.', display: 'standalone', background_color: '#F6EFE2', theme_color: '#F6EFE2', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }] }));
  writeFileSync(join(outDir, 'icon.svg'), read('site/icon.svg'));
  }
  log(`indexing ${INDEXING ? 'ON' : 'off (noindex)'}; ${urls.length} pages, ${rows.length} places, ${outdoors.length} outdoor rows, origin ${SITE_URL}`);
  return urls;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build({ log: console.log });
