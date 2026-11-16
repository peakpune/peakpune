// Two discovery pages built only from rows that already passed the publication audit:
//   /stops/      places and listings near each Pune Metro station
//   /interests/  the same rows grouped by hobby, not by weather or mood
// Nothing here is typed in by hand: no walking times, no timings, no invented listings.
// Distances are straight-line (haversine) from OpenStreetMap coordinates, and are labelled that way.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const STOPS_PATH = '/stops/';
export const INTERESTS_PATH = '/interests/';
const RADIUS_KM = 1.5;
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const km = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const known = (v) => v && v !== 'UNKNOWN';

export function stationsWithPlaces(root, places) {
  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  const metro = read('data/metro/metro.json');
  const geo = read('data/metro/station-geo.json');
  const lineOf = new Map();
  for (const line of metro.lines) for (const s of line.station_order) lineOf.set(`${line.id}|${norm(s)}`, s);
  const l3 = metro.lines.find((l) => l.id === 'pink_line3').station_status;
  const l3Open = new Set(l3.open.map(norm)), l3Closed = new Set(l3.closed.map(norm));
  const located = places.filter((p) => typeof p.lat === 'number' && typeof p.lon === 'number');
  return Object.entries(geo.stations).map(([id, st]) => {
    const lines = metro.lines.filter((l) => lineOf.has(`${l.id}|${norm(st.name)}`)).map((l) => {
      let note = 'open per the operator';
      if (l.id === 'pink_line3') note = l3Open.has(norm(st.name)) ? 'reported open (media)' : l3Closed.has(norm(st.name)) ? 'reported not open yet (media)' : 'status not confirmed';
      return { id: l.id, name: l.name, note };
    });
    const near = located.map((p) => ({ p, d: km(st, p) })).filter((x) => x.d <= RADIUS_KM).sort((a, b) => a.d - b.d);
    return { id, name: st.name, lat: st.lat, lon: st.lon, lines, near };
  }).filter((s) => s.lines.length).sort((a, b) => a.name.localeCompare(b.name));
}

export function buildStops({ root, esc, places, listings, TYPE_SINGULAR, slugOf }) {
  const stations = stationsWithPlaces(root, places);
  const withNear = stations.filter((s) => s.near.length);
  const without = stations.filter((s) => !s.near.length);
  const lineLabel = (s) => s.lines.map((l) => `${l.name}: ${l.note}`).join(' · ');
  const hood = (s) => s.near[0].p.neighbourhood;
  const card = (s) => {
    const here = known(hood(s)) ? listings.filter((e) => e.neighbourhood === hood(s)).slice(0, 3) : [];
    return `<article class="card" id="${esc(s.id)}"><div class="inner"><span class="eyebrow">${esc(s.lines.map((l) => l.name.replace(/ \(.*/, '')).join(' · '))}</span><h3>${esc(s.name)}</h3><p class="note">${esc(lineLabel(s))}</p>
<ul class="stop-list">${s.near.slice(0, 5).map(({ p, d }) => `<li><a href="/places/${slugOf(p)}/">${esc(p.name)}</a><span>${esc(TYPE_SINGULAR[p.type] || p.type)} · ${d.toFixed(1)} km straight line</span></li>`).join('')}</ul>
${here.length ? `<p class="note">Listed in ${esc(hood(s))}, the neighbourhood of the nearest place: ${here.map((e) => `<a href="${esc(e.href)}"${e.href.startsWith('http') ? ' rel="noopener" target="_blank"' : ''}>${esc(e.name)}</a>`).join(', ')}</p>` : ''}</div></article>`;
  };
    const main = `<div class="hero hero-single"><div><div class="eyebrow">Pick a Metro stop</div><h1>Start at the station.</h1>
<p class="lede">Pune Metro stations with the checked places within ${RADIUS_KM} km of each, nearest first. Distances are straight-line from OpenStreetMap coordinates, not walking time. Check the route on the map before you set out.</p></div></div>
<section class="section"><div class="section-head"><h2>${withNear.length} stations with a checked place nearby</h2><p>Only places that passed review and have coordinates are used. Line 3 open status is media-reported; the operator publishes no list. Hours, fares and the planner are in the <a href="/PuneMetroguide/">Metro guide</a>.</p></div>
<div class="grid">${withNear.map(card).join('')}</div></section>
<section class="section"><div class="section-head"><h2>Stations with nothing checked nearby yet</h2><p>${without.map((s) => esc(s.name)).join(', ')}.</p></div></section>`;
  return { main, count: withNear.length };
}

export const SHELVES = [
  { id: 'trek', title: 'Treks and forts', blurb: 'For people who want a summit, a fort or a night out on a hill.', tags: ['trek', 'trekking', 'fort', 'hiking', 'camping', 'waterfall'] },
  { id: 'running', title: 'Running', blurb: 'City loops, trail runs and races.', tags: ['running', 'run-route', 'road-running', 'trail-running', 'marathon', 'race'] },
  { id: 'books', title: 'Books and reading', blurb: 'Bookstores, libraries, archives and book clubs.', tags: ['books', 'bookstore', 'book-club', 'library', 'literature', 'archive'] },
  { id: 'history', title: 'History and heritage', blurb: 'Museums, old wadas and places with a past.', tags: ['heritage', 'history', 'museum'] },
  { id: 'food', title: 'Food and drink', blurb: 'Restaurants, cafes, sweets and brewpubs.', tags: ['restaurant', 'cafe', 'bakery', 'sweets', 'snacks', 'bar', 'brewery', 'thali'] },
  { id: 'art', title: 'Art, film and making things', blurb: 'Galleries, cultural centres and workshops.', tags: ['gallery', 'art', 'film', 'cultural-centre', 'workshop'] },
  { id: 'games-tech', title: 'Board games and tech', blurb: 'Communities that meet to play or build.', tags: ['board-games', 'tech'] },
  { id: 'nature', title: 'Parks and green Pune', blurb: 'Gardens, lakes and open space inside the city.', tags: ['park', 'garden', 'zoo', 'lake', 'nature', 'outdoor-spot'] },
];

export function buildInterests({ esc, groups }) {
  const shelves = SHELVES.map((s) => {
    const rows = groups.flatMap((g) => g.rows.filter((r) => (r.tags || []).some((t) => s.tags.includes(t))).map((r) => ({ r, g })));
    const seen = new Set();
    return { ...s, rows: rows.filter(({ r }) => (seen.has(r.id) ? false : seen.add(r.id))) };
  }).filter((s) => s.rows.length);
  const card = ({ r, g }) => {
    const href = g.href(r), ext = href.startsWith('http');
    return `<a class="card place-card" href="${esc(href)}"${ext ? ' rel="noopener" target="_blank"' : ''}><div class="inner"><span class="eyebrow">${esc(g.labelOf ? g.labelOf(r) : g.label)}${known(r.neighbourhood) ? ' · ' + esc(r.neighbourhood) : ''}</span><h3>${esc(r.name)}</h3><p>${esc(r.summary)}</p></div></a>`;
  };
  const main = `<div class="hero hero-single"><div><div class="eyebrow">Pune by interest</div><h1>What are you into?</h1>
<p class="lede">The same checked listings, grouped by hobby. Each card opens its own page or the organiser's page.</p></div></div>
<div class="chips" aria-label="Interests">${shelves.map((s) => `<a class="chip" href="#${s.id}">${esc(s.title)}</a>`).join('')}</div>
${shelves.map((s) => `<section class="section" id="${s.id}"><div class="section-head"><h2>${esc(s.title)}</h2><p>${esc(s.blurb)}</p></div><div class="grid">${s.rows.slice(0, 9).map(card).join('')}</div></section>`).join('')}`;
  return { main, shelves: shelves.map((s) => [s.title, s.rows.length]) };
}
