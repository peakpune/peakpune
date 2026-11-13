// Static site build: turns site/ fragments and data/ rows into crawlable pages in public/.
// No dependencies. Run: npm run build. Set SITE_URL to the production origin.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE_URL = (process.env.SITE_URL || 'https://peakpune.com').replace(/\/+$/, '');
// A project site (https://user.github.io/repo) is served under a sub-path: prefix root links with it.
export const BASE = new URL(SITE_URL + '/').pathname.replace(/\/+$/, '');
export const withBase = (html) => (BASE ? html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`) : html);
const read = (p) => readFileSync(join(root, p), 'utf8');

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON-LD sits inside a script tag: never let data close it.
export const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
export const safeUrl = (v) => { try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch { return null; } };
const known = (v) => v && v !== 'UNKNOWN';
export const slugOf = (row) => row.id.replace(/^place-/, '');
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

const NAV = [['/', 'Explore'], ['/places/', 'Places'], ['/outdoors/', 'Outdoors'], ['/events/', 'Events'], ['/meetups/', 'Meetups'], ['/moments/', 'Moments']];
const TYPE_LABEL = { museum: 'Museums', heritage: 'Heritage and history', temple: 'Temples', bookstore: 'Bookstores', gallery: 'Galleries', 'cultural-centre': 'Cultural centres', archive: 'Archives', cafe: 'Cafes', restaurant: 'Restaurants', bar: 'Bars and brewpubs', sweets: 'Sweets and snacks', park: 'Parks and gardens', zoo: 'Zoo' };
const TYPE_SINGULAR = { museum: 'Museum', heritage: 'Heritage site', temple: 'Temple', bookstore: 'Bookstore', gallery: 'Art gallery', 'cultural-centre': 'Cultural centre', archive: 'Archive', cafe: 'Cafe', restaurant: 'Restaurant', bar: 'Bar and brewpub', sweets: 'Sweet shop', park: 'Park', zoo: 'Zoo' };
const SCHEMA_TYPE = { museum: 'Museum', heritage: 'LandmarksOrHistoricalBuildings', temple: 'HinduTemple', bookstore: 'BookStore', gallery: 'ArtGallery', 'cultural-centre': 'Place', archive: 'ArchiveOrganization', cafe: 'CafeOrCoffeeShop', restaurant: 'Restaurant', bar: 'BarOrPub', sweets: 'FoodEstablishment', park: 'Park', zoo: 'Zoo' };

const mark = read('site/mark.svg.html');
const cta = read('site/cta.html');
const org = { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'Peak Pune', url: `${SITE_URL}/`, logo: `${SITE_URL}/icon.svg`, description: 'A Pune discovery site for places, events, meetups and Puneri moments.' };

export function page({ path, title, description, main, ld = [], current = path, crumbs = [], ogType = 'website', plans = false }) {
  const url = SITE_URL + path;
  const graph = [org, ...ld];
  if (crumbs.length) graph.push({ '@type': 'BreadcrumbList', itemListElement: [['Peak Pune', '/'], ...crumbs].map(([name, p], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + p })) });
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const trail = crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Peak Pune</a>${crumbs.map(([n, p], i) => (i === crumbs.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${p}">${esc(n)}</a>`)).join('')}</nav>` : '';
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#F6EFE2">
<meta name="geo.region" content="IN-MH">
<meta name="geo.placename" content="Pune">
<meta property="og:site_name" content="Peak Pune">
<meta property="og:locale" content="en_IN">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Peak Pune: everything Pune, in one scroll">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/fonts/fraunces.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="/tokens.css">
${jsonLd({ '@context': 'https://schema.org', '@graph': graph })}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="site-header"><div class="wrap bar"><a class="wordmark" href="/" aria-label="Peak Pune home">${mark}Peak <span>Pune</span></a><nav aria-label="Main navigation">${nav}</nav></div></header>
<div class="wrap"><aside class="review">Preview: source-listed plans, not organiser-confirmed. Uploads and submissions are not enabled.</aside>
<section class="community-links" aria-label="Community"><strong>Find your Pune people.</strong><div><a class="chip" href="https://chat.whatsapp.com/BVTlwmhkqGU4WKzCsZFG95?s=cl&amp;p=i&amp;iam=2" target="_blank" rel="noopener noreferrer">Join WhatsApp</a><a class="chip" href="https://www.reddit.com/r/punetonight/" target="_blank" rel="noopener noreferrer">r/punetonight</a></div></section></div>
<main id="main" class="wrap">
${trail}${main}
${cta}
</main>
<footer class="site-footer"><div class="wrap">
<div class="foot-brand"><a class="wordmark" href="/">${mark}Peak <span>Pune</span></a><p>Everything Pune, in one scroll. Made in Pune, for Pune. Not affiliated with any other city's peak.</p><p class="hash">#PeakPune · #OnlyInPune</p></div>
<nav aria-label="Sections"><h2>Explore</h2><a href="/places/">Places</a><a href="/outdoors/">Runs and treks</a><a href="/events/">Events</a><a href="/meetups/">Meetups</a><a href="/moments/">Moments</a></nav>
<nav aria-label="Powered by"><h2>Powered by</h2><a href="https://punerunners.com/" target="_blank" rel="noopener">PuneRunners.com</a><a href="https://punetrekkers.org/" target="_blank" rel="noopener">PuneTrekkers.org</a><a href="https://karawaan.in/" target="_blank" rel="noopener">karawaan.in</a><a href="/powered-by/">About these links</a></nav>
<p class="fine">Place and route details are sourced and dated. Event plans are platform listings, not organiser-confirmed. Map data © OpenStreetMap contributors.</p>
</div></footer>
<script type="module" src="/app.js"></script>${plans ? '<script type="module" src="/plans.js"></script>' : ''}
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
${row('Map', hasGeo ? `<a href="https://www.openstreetmap.org/?mlat=${r.lat}&amp;mlon=${r.lon}#map=17/${r.lat}/${r.lon}" rel="noopener nofollow">${r.lat}, ${r.lon}</a> <span class="note">© OpenStreetMap contributors</span>` : '')}
${row('Good to know', r.notes ? esc(r.notes) : '')}
</dl>
<p class="actions">${links.map(([u, l], i) => `<a class="${i ? 'chip' : 'primary'}" href="${esc(u)}" rel="noopener">${l}</a>`).join(' ')}</p>
<div class="provenance"><h2>Where this comes from</h2>
<p>Every detail above was read from the pages below on ${esc(r.checked_at)}. ${r.status === 'verified' ? 'Name, address and link are confirmed on the venue or organiser page.' : 'Some details are missing because the source page does not state them.'} Nothing is guessed. Timings and prices change, so confirm with the venue.</p>
<ul class="sources">${sources}</ul></div>
</article>${related.length ? `<section class="section"><div class="section-head"><h2>${near.length ? `More in ${esc(r.neighbourhood)} and nearby picks` : `More ${esc((TYPE_LABEL[r.type] || 'places').toLowerCase())} in Pune`}</h2></div><div class="grid">${related.map(placeCard).join('')}</div></section>` : ''}`;
}

function placesIndex(rows) {
  const groups = Object.keys(TYPE_LABEL).map((t) => [t, rows.filter((r) => r.type === t)]).filter(([, rs]) => rs.length);
  const card = (r) => `<a class="card place-card" href="/places/${slugOf(r)}/"><div class="inner"><span class="eyebrow">${esc(known(r.neighbourhood) ? r.neighbourhood : 'Pune')}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p>${known(r.hours) ? `<p class="note">${esc(clip(r.hours, 70))}</p>` : ''}</div></a>`;
  return `<div class="hero hero-single"><div><div class="eyebrow">Explore Pune</div><h1>Places in Pune,<br>checked at the source.</h1>
<p class="lede">${rows.length} museums, bookstores, cafes, restaurants, temples and heritage spots across Pune. Addresses, timings and prices are copied from each venue's own page, with the date we checked.</p></div></div>
<nav class="chips jump" aria-label="Jump to a category">${groups.map(([t]) => `<a class="chip" href="#${t}">${TYPE_LABEL[t]}</a>`).join('')}</nav>
<section class="section"><div class="section-head"><h2>Browse by area</h2></div><nav class="chips" aria-label="Areas">${areasOf(rows).map(([a, x]) => `<a class="chip" href="/places/in/${AREA_SLUG(a)}/">${esc(a)} (${x.length})</a>`).join('')}</nav></section>
${groups.map(([t, rs]) => `<section class="section" id="${t}"><div class="section-head"><h2>${TYPE_LABEL[t]} in Pune</h2></div><div class="grid">${rs.map(card).join('')}</div></section>`).join('\n')}
<p class="note">Not a ranking. Listed places are the ones whose details we could confirm on an official page. Missing your favourite? It is probably waiting on a source.</p>`;
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
<p>${isTrek(r) ? 'Distances, timings and difficulty are' : 'The route and its distance are'} as published by ${who}, read on ${esc(r.checked_at)}. Conditions change, and nobody at Peak Pune has walked or run this for you. Go early, go in company, and check with the source first.</p>
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
<section class="section" id="runs"><div class="section-head"><h2>Running loops in Pune</h2><p>Plotted by PuneRunners Club on OpenStreetMap data. Mapped, not run-tested: footpaths, traffic and lighting are unchecked.</p></div><div class="grid">${runs.map(outdoorCard).join('')}</div></section>
<section class="section" id="treks"><div class="section-head"><h2>Treks and day trips near Pune</h2><p>Nearest first. Distances and drive times are from Pune Trekkers' volunteer-written guides.</p></div><div class="grid">${treks.map(outdoorCard).join('')}</div></section>`;
}
function homeMain(places, outdoors) {
  const pick = (ids) => ids.map((id) => places.find((r) => r.id === id)).filter(Boolean);
  const feat = pick(['place-raja-dinkar-kelkar-museum', 'place-pagdandi-bookstore-coffee', 'place-marz-o-rin', 'place-joshis-museum-of-miniature-railways', 'place-shaniwar-wada', 'place-toit-pune']);
  const card = (r) => `<a class="card place-card" href="/places/${slugOf(r)}/"><div class="inner"><span class="eyebrow">${esc(TYPE_SINGULAR[r.type] || r.type)} · ${esc(known(r.neighbourhood) ? r.neighbourhood : 'Pune')}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p></div></a>`;
  const runs = outdoors.filter((r) => !isTrek(r)); const treks = outdoors.filter(isTrek);
  const near = [...treks].sort((a, b) => (a.distance_from_pune_km || 0) - (b.distance_from_pune_km || 0)).slice(0, 3);
  const tiles = [['Places', '/places/', `${places.length} checked at the source`], ['Runs and trails', '/outdoors/#runs', `${runs.length} mapped city loops`], ['Treks and day trips', '/outdoors/#treks', `${treks.length} with drive times`], ['Events', '/events/', 'Plans, with sources'], ['Meetups', '/meetups/', 'Communities to join'], ['Moments', '/moments/', 'Only in Pune']];
  return `<div class="hero"><div><div class="eyebrow">Made in Pune, for Pune</div><h1>Everything Pune,<br>in one scroll.</h1>
<p class="lede">Places to go, loops to run, forts to climb and the moments only Pune could produce. Every detail links back to where it came from.</p>
<p class="actions"><a class="primary" href="/places/">Browse places</a><a class="chip" href="/outdoors/">Runs and treks</a></p></div>
<div class="sign" lang="mr">दुपारी १ ते ४<br>दुकान बंद<small lang="en">PEAK PUNE · THE CITY HAS ITS TIMINGS.</small></div></div>
<nav class="tiles" aria-label="Browse Pune">${tiles.map(([t, h, d]) => `<a class="category" href="${h}"><h3>${t}</h3><span>${d}</span></a>`).join('')}</nav>
<section class="section"><div class="section-head"><h2>This weekend in Pune</h2><p>Source-listed plans from the current snapshot. Check dates and prices on the listing before you book.</p><a class="more" href="/events/">All events</a></div><div class="grid" id="weekend-plans"><p class="note">Loading source-listed plans...</p></div></section>
<section class="section"><div class="section-head"><h2>Places, checked at the source</h2><p>Addresses, timings and prices copied from each venue's own page, with the date we looked.</p><a class="more" href="/places/">All ${places.length} places</a></div><div class="grid">${feat.map(card).join('')}</div></section>
<section class="section band"><div class="section-head"><h2>Start early. The city is cooler.</h2><p>City loops from PuneRunners Club and trek guides from Pune Trekkers, sorted by how far you have to drive.</p><a class="more" href="/outdoors/">All runs and treks</a></div>
<div class="stats"><div><strong>${runs.length}</strong><span>running loops, 1.3 to 9.5 km</span></div><div><strong>${treks.length}</strong><span>treks and day trips</span></div><div><strong>${Math.min(...treks.map((t) => t.distance_from_pune_km).filter(Boolean))} km</strong><span>to the nearest trailhead</span></div></div>
<div class="grid">${near.map(outdoorCard).join('')}</div></section>
<section class="section"><div class="section-head"><h2>Powered by people who turn up</h2><p>Peak Pune does not organise runs, treks or trips. These three do.</p><a class="more" href="/powered-by/">How the links work</a></div>
<div class="grid">
<a class="card link-card pc-runners" href="https://punerunners.com/" rel="noopener"><div class="inner"><span class="eyebrow">Runs</span><h3>PuneRunners Club</h3><p>Free running community for every pace, with a race calendar and mapped routes.</p><span class="go">PuneRunners.com</span></div></a>
<a class="card link-card pc-trekkers" href="https://punetrekkers.org/" rel="noopener"><div class="inner"><span class="eyebrow">Treks</span><h3>Pune Trekkers</h3><p>Free, volunteer-run trekking group. Costs are split with no markup.</p><span class="go">PuneTrekkers.org</span></div></a>
<a class="card link-card pc-karawaan" href="https://karawaan.in/" rel="noopener"><div class="inner"><span class="eyebrow">Trips</span><h3>Karawaan</h3><p>Small-group treks, camping and trips built for people who come alone.</p><span class="go">karawaan.in</span></div></a>
</div></section>
<section class="section split"><div><div class="eyebrow">Peak Pune moments</div><h2>Closed 1 to 4.<br>The queue starts at 3:55.</h2><p>Signboards with opinions, rickshaws with confidence and a misal debate in its four-thousandth round. An archive of the things only Pune does.</p><p class="actions"><a class="chip" href="/moments/">See the archive</a></p></div>
<div class="sign sign-alt">"No parking.<br>Yes, you.<br>Also you."<small>FILED UNDER: PATYA</small></div></section>`;
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
  { slug: 'treks-within-70-km-of-pune', h1: 'Treks within 70 km of Pune', title: 'Treks within 70 km of Pune: short drives, real hills | Peak Pune', blurb: 'Trailheads the guides put at 70 km or less from Pune, so you can be back for a late lunch.', test: (r) => r.type === 'trek' && r.distance_from_pune_km && r.distance_from_pune_km <= 70 },
  { slug: 'forts-near-pune', h1: 'Fort treks near Pune', title: 'Fort treks near Pune: distance, difficulty and start points | Peak Pune', blurb: 'Sahyadri forts with a guide from Pune Trekkers, sorted by how far you have to drive.', test: (r) => r.type === 'trek' && r.tags.includes('fort') },
  { slug: 'monsoon-treks-near-pune', h1: 'Monsoon treks near Pune', title: 'Monsoon treks near Pune: guides that list June to September | Peak Pune', blurb: 'Treks whose best months, per the Pune Trekkers guide, include June to September. Trails are slippery in rain: read the guide and go with company.', test: (r) => r.type === 'trek' && monthsIn(r.best_months).some((m) => MONSOON.includes(m)) },
];
const byDrive = (a, b) => (a.distance_from_pune_km || 0) - (b.distance_from_pune_km || 0);
function eventsBlock(events) {
  const dated = events.filter((e) => e.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const recurring = events.filter((e) => e.recurrence);
  const day = (d) => new Date(d + 'T00:00:00+05:30').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const card = (e) => `<article class="card event-card" data-expires="${esc(e.expires_at || '')}"><div class="inner"><span class="eyebrow">${e.start_date ? esc(day(e.start_date)) : 'Recurring'}</span><h3>${esc(e.name)}</h3><p>${esc(e.summary)}</p><p class="meta"><span>${esc([known(e.organiser) ? e.organiser : null, known(e.neighbourhood) ? e.neighbourhood : null, e.price_note].filter(Boolean).join(' · '))}</span></p>${e.recurrence ? `<p class="note">${esc(e.recurrence)}</p>` : ''}<p class="plan-actions"><a class="chip" href="${esc(safeUrl(e.url_deep))}" rel="noopener">${e.status === 'verified' ? 'Organiser page' : 'Source page'}</a>${e.linked_id ? `<a class="chip" href="/places/${e.linked_id.replace(/^place-/, '')}/">About the venue</a>` : ''}</p></div></article>`;
  return `<section class="section" id="organisers"><div class="section-head"><h2>Straight from the organisers</h2><p>Races, treks and camps read on the organiser's own page on ${esc(events[0].checked_at)}. Dated cards disappear once the day has passed.</p></div><div class="grid">${dated.map(card).join('')}</div></section>
<section class="section" id="every-day"><div class="section-head"><h2>On every day</h2><p>Shows and schedules that repeat. Timings are as published by the venue.</p></div><div class="grid">${recurring.map(card).join('')}</div></section>`;
}
export function eventLd(e) {
  if (!e.start_date || e.status !== 'verified') return null;
  const ld = { '@type': 'Event', name: e.name, description: e.summary, startDate: e.start || e.start_date, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', url: safeUrl(e.url_deep), location: { '@type': 'Place', name: known(e.neighbourhood) ? `${e.neighbourhood}, Pune` : 'Pune', address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN', ...(known(e.address) ? { streetAddress: e.address } : {}) } } };
  if (e.end) ld.endDate = e.end;
  if (known(e.organiser)) ld.organizer = { '@type': 'Organization', name: e.organiser, url: safeUrl(e.url_official) || undefined };
  return ld;
}


const STATE = { active: ['Active', 'lv-easy'], DORMANT: ['Dormant', 'lv-hard'], UNKNOWN: ['Activity not confirmed', ''] };
function meetupsBlock(rows) {
  const card = (m) => `<article class="card"><div class="inner"><span class="eyebrow">${esc(m.tags.slice(0, 2).join(' · '))}${known(m.neighbourhood) ? ' · ' + esc(m.neighbourhood) : ''}</span><h3>${esc(m.name)}</h3><p>${esc(m.summary)}</p><p class="note">${esc(m.schedule_text)}</p><p class="meta"><span class="level ${STATE[m.activity_state][1]}">${STATE[m.activity_state][0]}</span>${m.cost_note ? `<span>${esc(m.cost_note)}</span>` : ''}</p><p class="plan-actions"><a class="chip" href="${esc(safeUrl(m.join_url))}" rel="noopener">How to join</a>${m.linked_id ? `<a class="chip" href="/places/${m.linked_id.replace(/^place-/, '')}/">About the venue</a>` : ''}</p></div></article>`;
  const live = rows.filter((m) => m.activity_state === 'active'); const rest = rows.filter((m) => m.activity_state !== 'active');
  return `<section class="section"><div class="section-head"><h2>Communities you can join today</h2><p>${live.length} Pune groups with a public joining page and dated activity, read on ${esc(rows[0].checked_at)}. Rules, costs and group links live on their own sites.</p></div><div class="grid">${live.map(card).join('')}</div></section>
<section class="section"><div class="section-head"><h2>Listed, activity not confirmed</h2><p>These groups have a public page but showed no dated activity when we looked. Ask before you turn up.</p></div><div class="grid">${rest.map(card).join('')}</div></section>`;
}
function momentsBlock(rows) {
  return rows.map((m) => `<a class="card place-card" href="/${m.linked_id.startsWith('place-') ? 'places/' + m.linked_id.replace(/^place-/, '') : 'outdoors/' + m.linked_id.replace(/^run-(trek-)?/, '')}/"><div class="inner"><span class="eyebrow">${esc(m.best_time)}</span><h3>${esc(m.caption)}</h3><p class="note">${esc(m.name)} · ${esc(m.season)}</p></div></a>`).join('');
}

const STATIC = [
  { file: 'meetups', path: '/meetups/', fill: 'meetups', title: 'Meetups in Pune: run clubs, book clubs, tech and board games | Peak Pune', description: 'Find your people in Pune: runners, readers, coders, board gamers and trekkers, with verified joining links.', crumbs: [['Meetups', '/meetups/']] },
  { file: 'moments', path: '/moments/', fill: 'moments', title: 'Peak Pune Moments: an archive of only-in-Pune moments', description: 'Shops shut 1 to 4, signboards with opinions and a misal debate that never ends. An archive of Puneri moments, filed under Peak Pune.', crumbs: [['Moments', '/moments/']] },
  { file: 'powered-by', path: '/powered-by/', title: 'Powered by PuneRunners, Pune Trekkers and Karawaan | Peak Pune', description: 'The three Pune groups behind Peak Pune runs, treks and trips: PuneRunners Club, Pune Trekkers and Karawaan. What each does and where to join.', crumbs: [['Powered by', '/powered-by/']] },
];

export function build({ outDir = join(root, 'public'), log = () => {} } = {}) {
  const rows = JSON.parse(read('data/batch-1-places/places.json')).filter((r) => r.scope === 'CORE' && r.status !== 'unverified');
  const outdoors = JSON.parse(read('data/batch-2-outdoors/outdoors.json')).filter((r) => r.status !== 'unverified');
  const out = (path, html) => { const f = join(outDir, path.replace(/^\//, ''), path.endsWith('/') ? 'index.html' : ''); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, withBase(html)); };
  const urls = [];
  const website = { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, url: `${SITE_URL}/`, name: 'Peak Pune', inLanguage: 'en-IN', publisher: { '@id': `${SITE_URL}/#org` } };
  out('/', page({ path: '/', title: 'Peak Pune | Things to do in Pune: places, runs, treks, events and meetups', description: 'Everything Pune, in one scroll. Sourced places to visit, running loops, treks near Pune, events, meetups and the moments only Pune could produce.', main: homeMain(rows, outdoors), ld: [website], plans: true }));
  urls.push(['/', null]);
  for (const p of STATIC) {
    let main = read(`site/pages/${p.file}.html`);
    if (p.fill === 'meetups') main = main.replace('<!--MEETUPS-->', meetupsBlock(JSON.parse(read('data/batch-4-meetups/meetups.json'))));
    if (p.fill === 'moments') main = main.replace('<!--MOMENTS-->', momentsBlock(JSON.parse(read('data/batch-5-moments-reference/moments.json'))));
    out(p.path, page({ ...p, main, ld: [{ '@type': 'WebPage', '@id': SITE_URL + p.path, url: SITE_URL + p.path, name: p.title, description: p.description, isPartOf: { '@id': `${SITE_URL}/#site` } }] }));
    urls.push([p.path, null]);
  }
  const placesDir = join(outDir, 'places');
  if (existsSync(placesDir)) rmSync(placesDir, { recursive: true });
  out('/places/', page({ path: '/places/', title: 'Places to visit in Pune: museums, bookstores, cafes and heritage | Peak Pune', description: `${rows.length} places in Pune with addresses, timings and entry fees checked on the venue's own page: museums, bookstores, cafes, restaurants, temples and heritage sites.`, main: placesIndex(rows), crumbs: [['Places', '/places/']], ld: [{ '@type': 'ItemList', name: 'Places in Pune', numberOfItems: rows.length, itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/places/${slugOf(r)}/` })) }] }));
  urls.push(['/places/', rows[0]?.checked_at]);
  for (const r of rows) {
    const path = `/places/${slugOf(r)}/`;
    out(path, page({ path, current: '/places/', title: placeTitle(r), description: placeDescription(r), main: placeMain(r, rows), crumbs: [['Places', '/places/'], [r.name, path]], ld: [placeLd(r)], ogType: 'article' }));
    urls.push([path, r.checked_at]);
  }
  const events = JSON.parse(read('data/batch-3-events/events.json')).filter((e) => e.status !== 'unverified');
  out('/events/', page({ path: '/events/', plans: true, title: 'Events in Pune this week: gigs, parties, races and treks | Peak Pune', description: 'What is on in Pune: source-listed gigs, club nights and comedy, plus races, treks and camps read from the organisers. Every plan links to its original listing.', crumbs: [['Events', '/events/']], main: read('site/pages/events.html').replace('<!--ORGANISER-EVENTS-->', eventsBlock(events)), ld: [{ '@type': 'CollectionPage', '@id': `${SITE_URL}/events/`, url: `${SITE_URL}/events/`, name: 'Events in Pune', isPartOf: { '@id': `${SITE_URL}/#site` } }, ...events.map(eventLd).filter(Boolean)] }));
  urls.push(['/events/', events[0]?.checked_at]);
  for (const [area, rs] of areasOf(rows)) {
    const path = `/places/in/${AREA_SLUG(area)}/`;
    out(path, page({ path, current: '/places/', title: `Places to visit in ${area}, Pune: ${rs.length} checked spots | Peak Pune`, description: clip(`${rs.length} places in ${area}, Pune with addresses and timings from their own pages: ${rs.map((r) => r.name).join(', ')}.`, 158), crumbs: [['Places', '/places/'], [area, path]], main: `<div class="hero hero-single"><div><div class="eyebrow">Places by area</div><h1>${esc(area)}</h1><p class="lede">${rs.length} places in ${esc(area)}, Pune, each with details copied from its own page and the date we checked.</p></div></div><section class="section"><div class="grid">${rs.map(placeCard).join('')}</div></section><section class="section"><div class="section-head"><h2>Other areas</h2></div><nav class="chips" aria-label="Areas">${areasOf(rows).filter(([a]) => a !== area).map(([a, x]) => `<a class="chip" href="/places/in/${AREA_SLUG(a)}/">${esc(a)} (${x.length})</a>`).join('')}</nav></section>`, ld: [{ '@type': 'ItemList', name: `Places in ${area}, Pune`, numberOfItems: rs.length, itemListElement: rs.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/places/${slugOf(r)}/` })) }] }));
    urls.push([path, rs[0].checked_at]);
  }
  const outDir2 = join(outDir, 'outdoors');
  if (existsSync(outDir2)) rmSync(outDir2, { recursive: true });
  out('/outdoors/', page({ path: '/outdoors/', title: 'Running routes in Pune and treks near Pune, with distances | Peak Pune', description: `${outdoors.filter((r) => !isTrek(r)).length} running loops inside Pune and ${outdoors.filter(isTrek).length} treks and day trips nearby, with distance from Pune, drive time and difficulty from PuneRunners and Pune Trekkers.`, main: outdoorsIndex(outdoors), crumbs: [['Outdoors', '/outdoors/']], ld: [{ '@type': 'ItemList', name: 'Runs and treks in and near Pune', numberOfItems: outdoors.length, itemListElement: outdoors.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/outdoors/${slugOut(r)}/` })) }] }));
  urls.push(['/outdoors/', outdoors[0]?.checked_at]);
  for (const r of outdoors) {
    const path = `/outdoors/${slugOut(r)}/`;
    const ld = { '@type': isTrek(r) ? 'TouristAttraction' : 'Place', '@id': `${SITE_URL}${path}#place`, name: r.name, description: r.summary, url: SITE_URL + path, ...(typeof r.lat === 'number' ? { geo: { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lon } } : {}) };
    out(path, page({ path, current: '/outdoors/', title: outdoorTitle(r), description: clip(`${r.summary} ${isTrek(r) && r.distance_from_pune_km ? `About ${r.distance_from_pune_km} km from Pune${r.travel_time_text ? ', ' + r.travel_time_text : ''}.` : ''}`.trim(), 158), main: outdoorMain(r, outdoors), crumbs: [['Outdoors', '/outdoors/'], [r.name, path]], ld: [ld], ogType: 'article' }));
    urls.push([path, r.checked_at]);
  }
  for (const c of COLLECTIONS) {
    const rs = outdoors.filter(c.test).sort(c.sort || byDrive); if (rs.length < 2) continue;
    const path = `/outdoors/${c.slug}/`;
    out(path, page({ path, current: '/outdoors/', title: c.title, description: clip(`${rs.length} ${c.h1.toLowerCase()}: ${rs.map((r) => r.name).join(', ')}. ${c.blurb}`, 158), crumbs: [['Outdoors', '/outdoors/'], [c.h1, path]], main: `<div class="hero hero-single"><div><div class="eyebrow">Outdoors · ${rs.length} listed</div><h1>${esc(c.h1)}</h1><p class="lede">${esc(c.blurb)}</p></div></div><section class="section"><div class="grid">${rs.map(outdoorCard).join('')}</div></section><section class="section"><div class="section-head"><h2>More ways to get out</h2></div><nav class="chips" aria-label="Collections">${COLLECTIONS.filter((x) => x !== c && outdoors.filter(x.test).length >= 2).map((x) => `<a class="chip" href="/outdoors/${x.slug}/">${esc(x.h1)}</a>`).join('')}</nav></section>`, ld: [{ '@type': 'ItemList', name: c.h1, numberOfItems: rs.length, itemListElement: rs.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/outdoors/${slugOut(r)}/` })) }] }));
    urls.push([path, rs[0].checked_at]);
  }
  out('/404.html', page({ path: '/404.html', title: 'Page not found | Peak Pune', description: 'This page is closed 1 to 4, or possibly forever.', main: '<div class="hero hero-single"><div><div class="eyebrow">404</div><h1>Closed. Not just 1 to 4.</h1><p>This page does not exist. The rest of Pune does.</p><p class="actions"><a class="primary" href="/">Back to Explore</a> <a class="chip" href="/places/">Browse places</a></p></div></div>' }).replace('content="index,follow,max-image-preview:large"', 'content="noindex"'));
  writeFileSync(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, d]) => `<url><loc>${esc(SITE_URL + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  writeFileSync(join(outDir, 'site.webmanifest'), JSON.stringify({ name: 'Peak Pune', short_name: 'Peak Pune', start_url: '.', display: 'standalone', background_color: '#F6EFE2', theme_color: '#F6EFE2', icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }] }));
  writeFileSync(join(outDir, 'icon.svg'), mark.replace('<svg class="mark"', '<svg xmlns="http://www.w3.org/2000/svg"').replace(' aria-hidden="true"', ''));
  log(`${urls.length} pages, ${rows.length} places, ${outdoors.length} outdoor rows, origin ${SITE_URL}`);
  return urls;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build({ log: console.log });
