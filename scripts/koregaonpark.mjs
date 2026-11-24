// /koregaonpark/: one neighbourhood guide with a map. Venue data is read from OpenStreetMap
// (data/koregaonpark/places.json). Nothing here claims Peak Pune visited, ranked or checked a venue.
import { readFileSync } from 'node:fs';

const root = process.cwd() + '/';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const KP_PATH = '/koregaonpark/';
export const KP_TITLE = 'Koregaon Park, Pune: map, restaurants, cafes and bars | Peak Pune';
export const KP_DESCRIPTION = 'A map and neighbourhood guide to Koregaon Park, Pune: restaurants, cafes, bars, parks and landmarks from OpenStreetMap, how to get there from Bund Garden Metro, and what the lanes are known for.';
const TYPES = [['restaurant', 'Restaurants', 'Restaurant'], ['cafe', 'Cafes and bakeries', 'Cafe or bakery'], ['bar', 'Bars and pubs', 'Bar or pub'], ['park', 'Parks and gardens', 'Park'], ['landmark', 'Landmarks', 'Landmark'], ['hotel', 'Hotels', 'Hotel']];
const METRO = { name: 'Bund Garden Metro station', lat: 18.54059, lon: 73.88344 };

export function kpGuide() {
  return JSON.parse(readFileSync(root + 'data/koregaonpark/guide.json', 'utf8'));
}
export function kpData() {
  return JSON.parse(readFileSync(root + 'data/koregaonpark/places.json', 'utf8'));
}
const osmUrl = (p) => `https://www.openstreetmap.org/${p.osm}`;
const detail = (p) => [p.cuisine.length ? p.cuisine.join(', ') : '', p.street, p.hours ? `Hours listed: ${p.hours}` : ''].filter(Boolean).join(' · ');

const GUIDE_BY_NAME = { 'Osho Teerth Park': 'osho-teerth-park', 'Osho Ashram': 'osho-meditation-resort', 'Malaka Spice': 'malaka-spice', 'Hidden Place- The Hang out': 'hidden-place' };
export function kpPins(places, guide = kpGuide()) {
  const shortBy = Object.fromEntries(guide.cards.map((c) => [c.id, c.short]));
  return [
    ...places.map((p) => ({ id: p.id, name: p.name, type: p.type, label: TYPES.find((t) => t[0] === p.type)[2], lat: p.lat, lon: p.lon, summary: (GUIDE_BY_NAME[p.name] && shortBy[GUIDE_BY_NAME[p.name]]) || detail(p) || 'Listed in OpenStreetMap, with no further detail.', href: osmUrl(p), ...(GUIDE_BY_NAME[p.name] ? { guide: GUIDE_BY_NAME[p.name] } : {}) })),
    { id: 'bund-garden-metro', name: METRO.name, type: 'metro', label: 'Pune Metro', lat: METRO.lat, lon: METRO.lon, summary: 'Pune Metro Line 2 (Aqua) station on Bund Garden Road, at the western edge of Koregaon Park.', href: 'https://www.openstreetmap.org/node/11699340649' },
  ];
}

export function kpMain(data = kpData(), guide = kpGuide()) {
  const places = data.places;
  const pins = kpPins(places, guide);
  const filters = [...TYPES.map((t) => [t[0], t[1]]), ['metro', 'Metro']].map(([t, l]) => `<button class="chip" type="button" data-type="${t}" aria-pressed="true">${esc(l)}</button>`).join('');
  const cards = guide.cards.map((c) => `<article class="card" id="${esc(c.id)}"><div class="inner"><span class="eyebrow">${esc(c.kind)} · ${esc(c.where)}</span><h3>${esc(c.name)}</h3>${c.text.map((t) => `<p>${esc(t)}</p>`).join('')}<p class="note">Sources: ${c.sources.map(([l, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(l)}</a>`).join(', ')}. Read ${esc(guide.accessed)}.</p></div></article>`).join('');
  const mentions = `<p>${esc(guide.mentions.intro)}</p><ul class="map-list">${guide.mentions.items.map((m) => `<li><a href="${esc(m.url)}" rel="noopener nofollow">${esc(m.name)}</a> <span class="note">${esc(m.note)}</span></li>`).join('')}</ul>`;
  const evs = `<section class="section" id="events"><div class="section-head"><h2>Dated events</h2><p>${esc(guide.events.intro)}</p></div><div class="grid">${guide.events.items.map((e) => `<article class="card"><div class="inner"><span class="eyebrow">${esc(e.when)} · ${esc(e.venue)}</span><h3>${esc(e.name)}</h3><p>${esc(e.note)}</p><p class="note">Sources: ${e.sources.map(([l, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(l)}</a>`).join(', ')}. Read ${esc(guide.accessed)}.</p></div></article>`).join('')}</div></section>`;
  const areas = guide.areas.map((a) => `<section class="section" id="${esc(a.id)}"><div class="section-head"><h2>${esc(a.title)}</h2></div>${a.paragraphs.map((t) => `<p>${esc(t)}</p>`).join('')}<p class="note">Sources: ${a.sources.map(([l, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(l)}</a>`).join(', ')}. Read ${esc(guide.accessed)}.</p></section>`).join('');
  const jump = [['about', 'About'], ['getting-there', 'Getting there'], ['central', 'The busy centre'], ['quieter', 'Quieter corners'], ['marigold', 'Marigold Complex'], ['worth-knowing', 'Worth knowing'], ['events', 'Dated events'], ['restaurant', 'Restaurants'], ['cafe', 'Cafes'], ['bar', 'Bars'], ['park', 'Parks'], ['data', 'Sources']].map(([id, l]) => `<a class="chip" href="#${id}">${l}</a>`).join('');
  const lists = TYPES.map(([t, label]) => {
    const rs = places.filter((p) => p.type === t);
    return `<section class="section" id="${t}"><div class="section-head"><h2>${label}</h2><p>${rs.length} listed</p></div><ul class="map-list">${rs.map((p) => `<li><a href="${esc(osmUrl(p))}" rel="noopener nofollow">${esc(p.name)}</a>${detail(p) ? ` <span class="note">${esc(detail(p))}</span>` : ''}${p.website ? ` <a class="note" href="${esc(p.website)}" rel="noopener nofollow">website</a>` : ''}</li>`).join('')}</ul></section>`;
  }).join('');
  const main = `<div class="map-head"><h1>Koregaon Park, Pune</h1><p class="lede">A map of the restaurants, cafes, bars, parks and landmarks of Koregaon Park, plus the basics for getting there and getting around the lanes.</p></div>
<section class="section map-section" aria-label="Map of Koregaon Park">
<div class="map-frame"><div id="kp-map" class="map-canvas" role="application" aria-label="Interactive map of Koregaon Park. Every pinned place is also listed after this map."></div>
<p class="map-fallback" id="map-fallback">The interactive map needs JavaScript and WebGL. Every place is listed below.</p></div>
<p class="note map-status" id="map-status" role="status"></p>
<nav class="chips map-filters" id="map-filters" aria-label="Filter pins by category">${filters}</nav>
</section>
<nav class="chips" aria-label="On this page">${jump}</nav>
<section class="section" id="about"><div class="section-head"><h2>About Koregaon Park</h2></div>
<p>Koregaon Park is a leafy, mostly residential neighbourhood in the east of Pune, with a busy strip of restaurants, cafes, bars and galleries. Its lanes are lined with older bungalows and large trees, which is why people come here for morning and evening walks as well as meals. Two main roads, North Main Road and South Main Road, run roughly parallel, joined by numbered lanes. Lanes 6 and 7 are the ones best known for pubs and food places. The Osho International Meditation Resort and the Osho Teerth Park, on Dhunjibhoy Road between lanes 2 and 3, are also here. Source: <a href="https://en.wikipedia.org/wiki/Koregaon_Park" rel="noopener nofollow">Wikipedia, Koregaon Park</a>.</p></section>
<section class="section" id="getting-there"><div class="section-head"><h2>Getting to Koregaon Park</h2></div>
<p>Bund Garden station on Pune Metro Line 2 (Aqua) is on Bund Garden Road, at the western edge of Koregaon Park, on the same side of the Mula-Mutha river as the neighbourhood. The Bund Garden bridge is what crosses the river, to Yerawada. Routing on OpenStreetMap data (routing.openstreetmap.de, walking profile) gives about 1.9 km, around 25 minutes on foot, from the station to Osho Teerth Park. Pavements and crossings vary, so check the route on a map before you set out.</p>
<p>From Osho Teerth Park, the same routing service gives about 3.3 km by road to Pune Junction railway station and about 8.0 km by road to Pune airport. These are road distances without traffic. For fares, line changes and ticketing, see the <a href="/PuneMetroguide/">Pune Metro guide</a>.</p></section>
<section class="section" id="run"><div class="section-head"><h2>Running here</h2></div>
<p>The shaded lanes make Koregaon Park a regular morning running area. See the <a href="/outdoors/koregaon-park-kalyani-nagar-loop/">Koregaon Park and Kalyani Nagar loop</a> for a route, and <a href="/meetups/">Pune running meetups</a> for groups that run here.</p></section>
${areas}
<section class="section" id="worth-knowing"><div class="section-head"><h2>Worth knowing</h2><p>Described from each place's own site or a named publication. Peak Pune has not visited or ranked them.</p></div><div class="grid">${cards}</div>${mentions}</section>
${evs}
${lists}
<section class="section" id="data"><div class="section-head"><h2>Where this list comes from</h2></div>
<p>Names, cuisines, street names and opening hours come from OpenStreetMap contributors (ODbL), read on 23 November 2026. Only places inside the area OpenStreetMap maps as Koregaon Park are included, so places just outside it, such as Kalyani Nagar, are not. OpenStreetMap is edited by volunteers. Peak Pune did not visit or rank these places, so a venue may have closed, moved or changed its hours. Check with the venue before you go. Each name links to its OpenStreetMap entry, where anyone can fix it. The map itself is drawn from OpenStreetMap data by OpenMapTiles vector tiles served by OpenFreeMap. To report a mistake on this page, use the contact on the <a href="/about/">about page</a>.</p></section>
<script type="application/json" id="map-data">${JSON.stringify(pins).replace(/</g, '\\u003c')}</script>`;
  return { main, pins };
}

export function kpLd(siteUrl, pins) {
  return [
    { '@type': 'Place', '@id': `${siteUrl}${KP_PATH}#place`, name: 'Koregaon Park', url: siteUrl + KP_PATH, description: KP_DESCRIPTION, address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN' }, geo: { '@type': 'GeoCoordinates', latitude: 18.5365, longitude: 73.8935 }, isPartOf: { '@id': `${siteUrl}/#site` } },
    { '@type': 'ItemList', name: 'Places in Koregaon Park', numberOfItems: pins.filter((p) => p.type !== 'metro').length, itemListElement: pins.filter((p) => p.type !== 'metro').map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name })) },
  ];
}
