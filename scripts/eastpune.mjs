// /eastpune/: one East Pune guide with a map. Venue data is read from OpenStreetMap
// (data/eastpune/places.json). Nothing here claims Peak Pune visited, ranked or checked a venue.
import { readFileSync } from 'node:fs';

const root = process.cwd() + '/';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const EP_PATH = '/eastpune/';
export const EP_TITLE = 'East Pune: map, restaurants, cafes, bars and neighbourhoods | Peak Pune';
export const EP_DESCRIPTION = 'A map and guide to East Pune: restaurants, cafes, bars, parks and malls across Kalyani Nagar, Viman Nagar, Kharadi, Wadgaon Sheri, Mundhwa and Hadapsar, from OpenStreetMap, plus how to get there on the Metro.';
const TYPES = [['restaurant', 'Restaurants', 'Restaurant'], ['cafe', 'Cafes', 'Cafe'], ['bar', 'Bars and pubs', 'Bar or pub'], ['park', 'Parks and gardens', 'Park'], ['mall', 'Malls', 'Mall'], ['landmark', 'Landmarks', 'Landmark'], ['hotel', 'Hotels', 'Hotel']];
const METROS = [
  { id: 'metro-kalyani-nagar', name: 'Kalyani Nagar Metro station', lat: 18.544481, lon: 73.905698, note: 'Aqua line station on Nagar Road.' },
  { id: 'metro-ramwadi', name: 'Ramwadi Metro station', lat: 18.557028, lon: 73.908563, note: 'Eastern terminus of the operational Aqua line.' },
];

export function epGuide() {
  return JSON.parse(readFileSync(root + 'data/eastpune/guide.json', 'utf8'));
}
export function epData() {
  return JSON.parse(readFileSync(root + 'data/eastpune/places.json', 'utf8'));
}
const osmUrl = (p) => `https://www.openstreetmap.org/${p.osm}`;
const detail = (p) => [p.cuisine.length ? p.cuisine.join(', ') : '', p.street, p.hours ? `Hours listed: ${p.hours}` : ''].filter(Boolean).join(' · ');

export function epPins(places, guide = epGuide()) {
  const shortBy = Object.fromEntries(guide.cards.map((c) => [c.id, c.text[0].split('. ')[0] + '.']));
  const GUIDE_BY_NAME = { 'Aga Khan Palace': 'aga-khan-palace' };
  return [
    ...places.map((p) => ({ id: p.id, name: p.name, type: p.type, label: TYPES.find((t) => t[0] === p.type)?.[2] || 'Place', neighbourhood: p.neighbourhood, lat: p.lat, lon: p.lon, summary: (GUIDE_BY_NAME[p.name] && shortBy[GUIDE_BY_NAME[p.name]]) || detail(p) || 'Listed in OpenStreetMap, with no further detail.', href: osmUrl(p), ...(GUIDE_BY_NAME[p.name] ? { guide: GUIDE_BY_NAME[p.name] } : {}) })),
    ...METROS.map((m) => ({ id: m.id, name: m.name, type: 'metro', label: 'Pune Metro', lat: m.lat, lon: m.lon, summary: m.note, href: 'https://www.openstreetmap.org/node/11699340655' })),
  ];
}

export function epMain(data = epData(), guide = epGuide()) {
  const places = data.places;
  const pins = epPins(places, guide);
  const filters = [...TYPES.map((t) => [t[0], t[1]]), ['metro', 'Metro']].map(([t, l]) => `<button class="chip" type="button" data-type="${t}" aria-pressed="true">${esc(l)}</button>`).join('');
  const cards = guide.cards.map((c) => `<article class="card" id="${esc(c.id)}"><div class="inner"><span class="eyebrow">${esc(c.kind)} · ${esc(c.where)}</span><h3>${esc(c.name)}</h3>${c.text.map((t) => `<p>${esc(t)}</p>`).join('')}<p class="note">Sources: ${c.sources.map(([l, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(l)}</a>`).join(', ')}. Read ${esc(guide.accessed)}.</p></div></article>`).join('');
  const mentions = `<p>${esc(guide.mentions.intro)}</p><ul class="map-list">${guide.mentions.items.map((m) => `<li><a href="${esc(m.url)}" rel="noopener nofollow">${esc(m.name)}</a> <span class="note">${esc(m.note)}</span></li>`).join('')}</ul>`;
  const areas = guide.areas.map((a) => `<section class="section" id="${esc(a.id)}"><div class="section-head"><h2>${esc(a.title)}</h2></div>${a.paragraphs.map((t) => `<p>${esc(t)}</p>`).join('')}<p class="note">Sources: ${a.sources.map(([l, u]) => `<a href="${esc(u)}" rel="noopener nofollow">${esc(l)}</a>`).join(', ')}. Read ${esc(guide.accessed)}.</p></section>`).join('');
  const jump = [['about', 'About'], ['getting-there', 'Getting there'], ...guide.areas.map((a) => [a.id, a.title]), ['worth-knowing', 'Worth knowing'], ['restaurant', 'Restaurants'], ['cafe', 'Cafes'], ['bar', 'Bars'], ['park', 'Parks'], ['mall', 'Malls'], ['data', 'Sources']].map(([id, l]) => `<a class="chip" href="#${id}">${l}</a>`).join('');
  const lists = TYPES.map(([t, label]) => {
    const rs = places.filter((p) => p.type === t);
    if (!rs.length) return '';
    return `<section class="section" id="${t}"><div class="section-head"><h2>${label}</h2><p>${rs.length} listed</p></div><ul class="map-list">${rs.map((p) => `<li><a href="${esc(osmUrl(p))}" rel="noopener nofollow">${esc(p.name)}</a> <span class="note">${esc(p.neighbourhood)}${detail(p) ? ' · ' + esc(detail(p)) : ''}</span>${p.website ? ` <a class="note" href="${esc(p.website)}" rel="noopener nofollow">website</a>` : ''}</li>`).join('')}</ul></section>`;
  }).join('');
  const main = `<div class="map-head"><h1>East Pune</h1><p class="lede">A map of restaurants, cafes, bars, parks and malls across Kalyani Nagar, Wadgaon Sheri and Mundhwa, most of Viman Nagar, and the main-road parts of Kharadi and Hadapsar, plus the basics for getting there.</p></div>
<section class="section map-section" aria-label="Map of East Pune">
<div class="map-frame"><div id="ep-map" class="map-canvas" role="application" aria-label="Interactive map of East Pune. Every pinned place is also listed after this map."></div>
<p class="map-fallback" id="map-fallback">The interactive map needs JavaScript and WebGL. Every place is listed below.</p></div>
<p class="note map-status" id="map-status" role="status"></p>
<nav class="chips map-filters" id="map-filters" aria-label="Filter pins by category">${filters}</nav>
</section>
<nav class="chips" aria-label="On this page">${jump}</nav>
<section class="section" id="about"><div class="section-head"><h2>What this page means by East Pune</h2></div>
<p>East Pune has no official boundary. This guide covers the band of neighbourhoods east of the city centre along Nagar Road and the Mula-Mutha river: Kalyani Nagar, Viman Nagar, Wadgaon Sheri, Kharadi, Mundhwa and Hadapsar with Magarpatta. The map covers a 3.4 km circle centred on Wadgaon Sheri: all of Kalyani Nagar, Wadgaon Sheri and Mundhwa fall inside it, while northern Viman Nagar, eastern Kharadi and parts of southern Hadapsar and Magarpatta do not, so those edges are under-covered. Koregaon Park sits at its western edge, so it is left out of this list. The airport corridor, the IT parks and the big malls are all in this band.</p></section>
<section class="section" id="getting-there"><div class="section-head"><h2>Getting to East Pune</h2></div>
<p>Pune Metro's Aqua line runs along Nagar Road through the area. The operator's project profile, verified for the Pune Metro guide on 14 November 2026, lists two open stations in this area: Kalyani Nagar and Ramwadi, which is the eastern terminus. Viman Nagar and Kharadi have no Metro station today; the Ramwadi to Wagholi extension, <a href="https://www.pmindia.gov.in/en/news_updates/cabinet-approves-pune-metro-rail-project-phase-2-vanaz-to-chandani-chowk-corridor-2a-ramwadi-to-wagholi-vitthalwadi-corridor-2b-extension-of-the-existing-pune-metro-phase-i-vanaz-ramw/" rel="noopener nofollow">approved by the Union Cabinet in June 2025</a>, would serve them, but no opening date is confirmed, so Ramwadi plus a short road hop is the current route. Fares, line changes and ticketing: the <a href="/PuneMetroguide/">Pune Metro guide</a>.</p>
<p>Pune airport sits just north of Viman Nagar, which makes this the closest part of the city to the terminal. Pune Junction railway station is west of Koregaon Park; Hadapsar has a suburban station on the line towards Daund. The map circle stops short of Aditi Gardens in the middle of Magarpatta, so that park is described in the Hadapsar section but not pinned. Distances depend on where in East Pune you are headed, so route them from the map.</p></section>
${areas}
<section class="section" id="worth-knowing"><div class="section-head"><h2>Worth knowing</h2><p>Described from each place's own site or a named publication. Peak Pune has not visited or ranked them.</p></div><div class="grid">${cards}</div>${mentions}</section>
${lists}
<section class="section" id="data"><div class="section-head"><h2>Where this list comes from</h2></div>
<p>Names, cuisines, street names and opening hours come from OpenStreetMap contributors (ODbL), read on 24 November 2026. ${esc(data.area_note)} OpenStreetMap is edited by volunteers. Peak Pune did not visit or rank these places, so a venue may have closed, moved or changed its hours. Check with the venue before you go. Each name links to its OpenStreetMap entry, where anyone can fix it. The map itself is drawn from OpenStreetMap data by OpenMapTiles vector tiles served by OpenFreeMap. To report a mistake on this page, use the contact on the <a href="/about/">about page</a>.</p></section>
<script type="application/json" id="map-data">${JSON.stringify(pins).replace(/</g, '\\u003c')}</script>`;
  return { main, pins };
}

export function epLd(siteUrl, pins) {
  return [
    { '@type': 'Place', '@id': `${siteUrl}${EP_PATH}#place`, name: 'East Pune', url: siteUrl + EP_PATH, description: EP_DESCRIPTION, address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN' }, geo: { '@type': 'GeoCoordinates', latitude: 18.5495, longitude: 73.9225 }, isPartOf: { '@id': `${siteUrl}/#site` } },
    { '@type': 'ItemList', name: 'Places in East Pune', numberOfItems: pins.filter((p) => p.type !== 'metro').length, itemListElement: pins.filter((p) => p.type !== 'metro').map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.name })) },
  ];
}
