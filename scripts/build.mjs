// Static site build: turns site/ fragments and data/ rows into crawlable pages in public/.
// No dependencies. Run: npm run build. Set SITE_URL to the production origin.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SITE_URL = (process.env.SITE_URL || 'https://peakpune.com').replace(/\/+$/, '');
const read = (p) => readFileSync(join(root, p), 'utf8');

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// JSON-LD sits inside a script tag: never let data close it.
export const jsonLd = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
export const safeUrl = (v) => { try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null; } catch { return null; } };
const known = (v) => v && v !== 'UNKNOWN';
export const slugOf = (row) => row.id.replace(/^place-/, '');
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

const NAV = [['/', 'Explore'], ['/places/', 'Places'], ['/events/', 'Events'], ['/meetups/', 'Meetups'], ['/moments/', 'Moments'], ['/powered-by/', 'Powered by']];
const TYPE_LABEL = { museum: 'Museums', heritage: 'Heritage and history', temple: 'Temples', bookstore: 'Bookstores', gallery: 'Galleries', 'cultural-centre': 'Cultural centres', archive: 'Archives', cafe: 'Cafes', restaurant: 'Restaurants', bar: 'Bars and brewpubs', sweets: 'Sweets and snacks', park: 'Parks and gardens', zoo: 'Zoo' };
const TYPE_SINGULAR = { museum: 'Museum', heritage: 'Heritage site', temple: 'Temple', bookstore: 'Bookstore', gallery: 'Art gallery', 'cultural-centre': 'Cultural centre', archive: 'Archive', cafe: 'Cafe', restaurant: 'Restaurant', bar: 'Bar and brewpub', sweets: 'Sweet shop', park: 'Park', zoo: 'Zoo' };
const SCHEMA_TYPE = { museum: 'Museum', heritage: 'LandmarksOrHistoricalBuildings', temple: 'HinduTemple', bookstore: 'BookStore', gallery: 'ArtGallery', 'cultural-centre': 'Place', archive: 'ArchiveOrganization', cafe: 'CafeOrCoffeeShop', restaurant: 'Restaurant', bar: 'BarOrPub', sweets: 'FoodEstablishment', park: 'Park', zoo: 'Zoo' };

const mark = read('site/mark.svg.html');
const cta = read('site/cta.html');
const org = { '@type': 'Organization', '@id': `${SITE_URL}/#org`, name: 'Peak Pune', url: `${SITE_URL}/`, logo: `${SITE_URL}/icon.svg`, description: 'A Pune discovery site for places, events, meetups and Puneri moments.' };

export function page({ path, title, description, main, ld = [], current = path, crumbs = [], ogType = 'website' }) {
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
<div class="wrap">
<header><a class="wordmark" href="/" aria-label="Peak Pune home">${mark}Peak <span>Pune</span></a><nav aria-label="Main navigation">${nav}</nav></header>
<aside class="review">Starter preview. Place details are sourced and dated. Events, meetups and submissions are not live yet.</aside>
<main id="main">
${trail}${main}
${cta}
</main>
<footer><strong>Peak Pune</strong><span class="powered">Powered by <a href="https://punerunners.com/" target="_blank" rel="noopener">PuneRunners.com</a> <a href="https://punetrekkers.org/" target="_blank" rel="noopener">PuneTrekkers.org</a> <a href="https://karawaan.in/" target="_blank" rel="noopener">karawaan.in</a> <a href="/powered-by/">About these links</a></span><span>#PeakPune · #OnlyInPune · Made in Pune, for Pune.</span></footer>
</div>
<script type="module" src="/app.js"></script>
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

function placeMain(r) {
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
</article>`;
}

function placesIndex(rows) {
  const groups = Object.keys(TYPE_LABEL).map((t) => [t, rows.filter((r) => r.type === t)]).filter(([, rs]) => rs.length);
  const card = (r) => `<a class="card place-card" href="/places/${slugOf(r)}/"><div class="inner"><span class="eyebrow">${esc(known(r.neighbourhood) ? r.neighbourhood : 'Pune')}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p>${known(r.hours) ? `<p class="note">${esc(clip(r.hours, 70))}</p>` : ''}</div></a>`;
  return `<div class="hero hero-single"><div><div class="eyebrow">Explore Pune</div><h1>Places in Pune,<br>checked at the source.</h1>
<p>${rows.length} museums, bookstores, cafes, restaurants, temples and heritage spots across Pune. Addresses, timings and prices are copied from each venue's own page, with the date we checked.</p></div></div>
<nav class="chips jump" aria-label="Jump to a category">${groups.map(([t]) => `<a class="chip" href="#${t}">${TYPE_LABEL[t]}</a>`).join('')}</nav>
${groups.map(([t, rs]) => `<section class="section" id="${t}"><h2>${TYPE_LABEL[t]} in Pune</h2><div class="grid">${rs.map(card).join('')}</div></section>`).join('\n')}
<p class="note">Not a ranking. Listed places are the ones whose details we could confirm on an official page. Missing your favourite? It is probably waiting on a source.</p>`;
}

const STATIC = [
  { file: 'explore', path: '/', title: 'Peak Pune | Things to do in Pune: places, events, meetups and moments', description: 'Everything Pune, in one scroll. Sourced places to visit, events, meetups, runs, treks and the moments only Pune could produce.' },
  { file: 'events', path: '/events/', title: 'Events in Pune: gigs, comedy, pop-ups and parties | Peak Pune', description: 'What is on in Pune: gigs, club nights, pop-ups and comedy, each linked to the original organiser. No invented dates or prices.', crumbs: [['Events', '/events/']] },
  { file: 'meetups', path: '/meetups/', title: 'Meetups in Pune: run clubs, book clubs, tech and board games | Peak Pune', description: 'Find your people in Pune: runners, readers, coders, board gamers and trekkers, with verified joining links.', crumbs: [['Meetups', '/meetups/']] },
  { file: 'moments', path: '/moments/', title: 'Peak Pune Moments: an archive of only-in-Pune moments', description: 'Shops shut 1 to 4, signboards with opinions and a misal debate that never ends. An archive of Puneri moments, filed under Peak Pune.', crumbs: [['Moments', '/moments/']] },
  { file: 'powered-by', path: '/powered-by/', title: 'Powered by PuneRunners, Pune Trekkers and Karawaan | Peak Pune', description: 'The three Pune groups behind Peak Pune runs, treks and trips: PuneRunners Club, Pune Trekkers and Karawaan. What each does and where to join.', crumbs: [['Powered by', '/powered-by/']] },
];

export function build({ outDir = join(root, 'public'), log = () => {} } = {}) {
  const rows = JSON.parse(read('data/batch-1-places/places.json')).filter((r) => r.scope === 'CORE' && r.status !== 'unverified');
  const out = (path, html) => { const f = join(outDir, path.replace(/^\//, ''), path.endsWith('/') ? 'index.html' : ''); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, html); };
  const urls = [];
  const website = { '@type': 'WebSite', '@id': `${SITE_URL}/#site`, url: `${SITE_URL}/`, name: 'Peak Pune', inLanguage: 'en-IN', publisher: { '@id': `${SITE_URL}/#org` } };
  for (const p of STATIC) {
    let main = read(`site/pages/${p.file}.html`);
    if (p.file === 'explore') main += `<div class="section"><h2>Places, checked at the source</h2><p>${rows.length} Pune places with addresses, timings and prices taken from their own pages.</p><p class="actions"><a class="primary" href="/places/">Browse places in Pune</a></p></div>`;
    out(p.path, page({ ...p, main: `<section data-page="${p.file}">${main}</section>`, ld: p.path === '/' ? [website] : [{ '@type': 'WebPage', '@id': SITE_URL + p.path, url: SITE_URL + p.path, name: p.title, description: p.description, isPartOf: { '@id': `${SITE_URL}/#site` } }] }));
    urls.push([p.path, null]);
  }
  const placesDir = join(outDir, 'places');
  if (existsSync(placesDir)) rmSync(placesDir, { recursive: true });
  out('/places/', page({ path: '/places/', title: 'Places to visit in Pune: museums, bookstores, cafes and heritage | Peak Pune', description: `${rows.length} places in Pune with addresses, timings and entry fees checked on the venue's own page: museums, bookstores, cafes, restaurants, temples and heritage sites.`, main: placesIndex(rows), crumbs: [['Places', '/places/']], ld: [{ '@type': 'ItemList', name: 'Places in Pune', numberOfItems: rows.length, itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, name: r.name, url: `${SITE_URL}/places/${slugOf(r)}/` })) }] }));
  urls.push(['/places/', rows[0]?.checked_at]);
  for (const r of rows) {
    const path = `/places/${slugOf(r)}/`;
    out(path, page({ path, current: '/places/', title: placeTitle(r), description: placeDescription(r), main: placeMain(r), crumbs: [['Places', '/places/'], [r.name, path]], ld: [placeLd(r)], ogType: 'article' }));
    urls.push([path, r.checked_at]);
  }
  out('/404.html', page({ path: '/404.html', title: 'Page not found | Peak Pune', description: 'This page is closed 1 to 4, or possibly forever.', main: '<div class="hero hero-single"><div><div class="eyebrow">404</div><h1>Closed. Not just 1 to 4.</h1><p>This page does not exist. The rest of Pune does.</p><p class="actions"><a class="primary" href="/">Back to Explore</a> <a class="chip" href="/places/">Browse places</a></p></div></div>' }).replace('content="index,follow,max-image-preview:large"', 'content="noindex"'));
  writeFileSync(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([p, d]) => `<url><loc>${esc(SITE_URL + p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);
  writeFileSync(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  writeFileSync(join(outDir, 'site.webmanifest'), JSON.stringify({ name: 'Peak Pune', short_name: 'Peak Pune', start_url: '/', display: 'standalone', background_color: '#F6EFE2', theme_color: '#F6EFE2', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }] }));
  writeFileSync(join(outDir, 'icon.svg'), mark.replace('<svg class="mark"', '<svg xmlns="http://www.w3.org/2000/svg"').replace(' aria-hidden="true"', ''));
  log(`${urls.length} pages, ${rows.length} places, origin ${SITE_URL}`);
  return urls;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build({ log: console.log });
