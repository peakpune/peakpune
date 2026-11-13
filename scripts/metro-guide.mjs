// Pune Metro guide at /PuneMetroguide/ : static HTML generated from data/metro/*.json,
// plus hashed assets, the Gleam planner bundle (if built) and the offline service worker.
// Every operational date and count is rendered from the dataset; nothing is hardcoded in markup.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { buildModel, loadMetro, OPERATOR_LABEL } from './metro-model.mjs';

// Astro bundles this module; cwd is the project root in every build path (same as scripts/build.mjs).
const root = process.cwd();
const read = (p) => readFileSync(join(root, p), 'utf8');
export const GUIDE_PATH = '/PuneMetroguide/';
export const PLANNER_BUNDLE = 'metro/dist/planner.js'; // built by `npm run metro:build` (Gleam + esbuild) and committed
const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

export const longDate = (iso) => new Date(iso + 'T00:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

export function renderGuideMain({ data, model, areas, esc }) {
  const verified = data.verified_on;
  const ext = (href, label) => `<a class="ext" href="${esc(href)}" rel="noopener">${esc(label)}<span class="net" title="Needs an internet connection">needs internet</span></a>`;
  const name = Object.fromEntries(model.stations.map((s) => [s.id, s.names[0]]));
  const lineName = Object.fromEntries(data.lines.map((l) => [l.id, l.name]));
  const lineShort = { purple: 'Purple', aqua: 'Aqua', pink_line3: 'Pink (Line 3)' };
  const chip = (id) => `<span class="line-chip lc-${esc(id)}">${esc(lineShort[id])}</span>`;
  const tag = (m) => {
    if (m.state === 'not_open') return ['Listed, not open', 'tag-not'];
    if (m.statusSource === 'operator' && m.verified) return m.state === 'open' ? ['Open', 'tag-open'] : ['Not open', 'tag-not'];
    return m.state === 'open' ? ['Reported open (media)', 'tag-media'] : ['Reported not open yet (media)', 'tag-media-closed'];
  };
  const stationTag = (id) => {
    const ms = model.lines.filter((l) => l.order.includes(id)).map((l) => model.membership[`${l.id}:${id}`]);
    const best = ms.find((m) => m.statusSource === 'operator' && m.verified && m.state === 'open') || ms.find((m) => m.state === 'open') || ms[0];
    return tag(best);
  };
  const open = (lineId) => model.lines.find((l) => l.id === lineId).order.filter((id) => model.membership[`${lineId}:${id}`].state === 'open');
  const ps = data.lines.find((l) => l.id === 'pink_line3');
  const mm = data.fares.maha_metro, l3 = data.fares.line3, tm = data.timetables, tk = data.ticketing, ops = data.operators;
  const homeStats = ops.maha_metro.homepage_stats;

  // ---- fare tables ----
  const seen = new Set(); const keep = [];
  model.mahaIds.forEach((id, i) => { if (!seen.has(id)) { seen.add(id); keep.push(i); } });
  const disputed = new Set(model.disputed.map((p) => [p.a, p.b].sort().join('|')));
  const codeOf = (i) => mm.station_order[i];
  const mahaHead = keep.map((i) => `<th scope="col" title="${esc(name[model.mahaIds[i]])}">${esc(codeOf(i).replace('_AQ', ''))}</th>`).join('');
  const mahaRows = keep.map((i) => {
    const a = model.mahaIds[i];
    const cells = keep.map((j) => {
      const b = model.mahaIds[j];
      if (i === j) return '<td class="zero">–</td>';
      if (disputed.has([a, b].sort().join('|'))) return '<td class="chk" title="Printed differently in each direction on the operator chart"><span aria-label="check the official fare chart">?</span></td>';
      return `<td>${model.mahaMatrix[i][j]}</td>`;
    }).join('');
    return `<tr><th scope="row">${esc(name[a])} <small>${esc(codeOf(i).replace('_AQ', ''))}</small></th>${cells}</tr>`;
  }).join('');
  const pinkNames = model.lines.find((l) => l.id === 'pink_line3').orderNames;
  const pinkHead = pinkNames.map((n) => `<th scope="col" title="${esc(n)}"><span>${esc(n)}</span></th>`).join('');
  const pinkRows = pinkNames.map((n, i) => `<tr><th scope="row">${esc(n)}</th>${pinkNames.map((_, j) => (i === j ? '<td class="zero">–</td>' : `<td>${model.pinkMatrix[i][j]}</td>`)).join('')}</tr>`).join('');
  const disputedList = model.disputed.map((p) => `${esc(name[p.a])} / ${esc(name[p.b])}`).join('; ');

  // ---- network ----
  const lineCard = (l) => {
    const dl = data.lines.find((x) => x.id === l.id);
    const rows = l.order.map((id, k) => {
      const m = model.membership[`${l.id}:${id}`]; const [t, c] = tag(m);
      const plain = m.state === 'open' && (m.verified || m.statusSource === 'media');
      return `<li><span class="nm">${esc(l.orderNames[k])}</span>${plain ? '' : `<span class="tag ${c}">${esc(t)}</span>`}</li>`;
    }).join('');
    const facts = l.id === 'pink_line3'
      ? `<li><strong>Operator:</strong> ${esc(OPERATOR_LABEL.pitcmrl)}, a joint venture of the Tata Group and Siemens, under a concession from PMRDA</li><li><strong>Route:</strong> ${esc(l.termini[0])} (Hinjawadi) to ${esc(l.termini[1])}, fully elevated</li><li><strong>Length and time:</strong> ${esc(dl.length_km)} km, about ${esc(dl.end_to_end_min)} minutes end to end (operator timetable)</li><li><strong>Stations:</strong> ${l.order.length} on the operator list. Which are open comes from media reports only (${open(l.id).length} reported open); the operator publishes no list, so none can be chosen in the planner yet. Service reportedly started ${esc(longDate(dl.passenger_service_started.date))}.</li>`
      : `<li><strong>Operator:</strong> ${esc(OPERATOR_LABEL.maha_metro)}</li><li><strong>Route:</strong> ${esc(l.termini[0])} to ${esc(l.termini[1])}</li><li><strong>Length and time:</strong> ${esc(dl.length_km)} km and ${esc(dl.end_to_end_min)} minutes end to end (timetable image). The project profile page gives ${esc(dl.length_km_project_profile)} km.</li><li><strong>Stations:</strong> ${open(l.id).length} open${l.id === 'purple' ? ', plus Range Hill, which the operator lists without an Open tag' : ''}. Status read from the operator's project profile.</li>`;
    return `<article class="line-card" id="line-${esc(l.id)}"><h3><span class="line-chip lc-${esc(l.id)}">${esc(l.name)}</span></h3><ul class="facts-list">${facts}</ul><ol class="stations" aria-label="Stations on ${esc(l.name)}">${rows}</ol></article>`;
  };

  // ---- areas ----
  const areaCard = (a) => {
    const chips = a.stations.map((s) => {
      const st = model.stations.find((x) => x.id === s.id); const [t] = stationTag(s.id);
      return `<li>${st.lines.map((id) => `<span class="line-chip lc-${esc(id)}" title="${esc(lineName[id])}"></span>`).join('')}<span>${esc(name[s.id])}</span><span class="tag ${t.startsWith('Reported not') ? 'tag-media-closed' : t.startsWith('Reported') ? 'tag-media' : 'tag-open'}">${esc(t)}</span></li>`;
    }).join('');
    const ref = a.references.map((r) => `${esc(r.label)}'s reference point`).join(' and ');
    return `<article class="area" id="area-${esc(a.id)}"><h3>${esc(a.name)}</h3><p>${esc(a.note)}</p><p class="note"><strong>${a.has_station ? 'Has a station' : 'No station in the area'}.</strong> Closest first, by straight line from ${ref} (OpenStreetMap).</p><ul class="area-stations" aria-label="Closest stations to ${esc(a.name)}">${chips}</ul></article>`;
  };

  // ---- discounts, sources ----
  const disc = data.discounts.items.map((d) => `<li><strong>${esc(d.text)}</strong>${esc(d.where)}. ${d.note ? esc(d.note) + ' ' : ''}${ext(d.source, 'Operator page')}</li>`).join('');
  const P = data.provenance;
  const srcs = [
    ['Maha Metro (Lines 1 and 2)', [['Homepage', P.mahametro_homepage], ['Fare chart page', P.mahametro_fare_chart_page], ['Fare chart image', P.mahametro_fare_matrix_image], ['Timetable page', P.mahametro_timetable_page], ['Timetable image 1', P.mahametro_timetable_images[0]], ['Timetable image 2', P.mahametro_timetable_images[1]], ['One Pune Card', P.mahametro_one_pune_card], ['One Pune Card (Non-KYC)', P.mahametro_one_pune_card_non_kyc], ['Vidyarthi Pass', P.mahametro_vidyarthi_pass], ['Project profile', P.mahametro_project_profile]]],
    ['PITCMRL (Line 3)', [['Homepage', P.line3_homepage], ['Station list', P.line3_station_list], ['Fare table page', P.line3_fare_table_page], ['Fare chart image', P.line3_fare_chart_image], ['Time table page', P.line3_timetable_page], ['Time table image', P.line3_timetable_image], ['Route map', P.line3_route_map], ['Key highlights', P.line3_highlights], ['Overview', P.line3_overview], ['Passenger amenities', P.line3_amenities], ['Contact', P.line3_contact]]],
  ].map(([t, items]) => `<h3>${esc(t)}</h3><ul class="src-list">${items.map(([l, u]) => `<li>${ext(u, l)}</li>`).join('')}</ul>`).join('');
  const fallbackLinks = `${ext(P.mahametro_fare_chart_page, 'Maha Metro fare chart (Lines 1 and 2)')} · ${ext(P.line3_fare_table_page, 'Line 3 fare table')}`;

  return `<div class="metro">
<div class="hero hero-single"><div><div class="eyebrow">Pune Metro guide</div><h1>Pune Metro, simply.</h1>
<p class="lede">Which line, where to change and what it costs. Works offline after one visit.</p>
<p class="verified"><span>Checked on</span> <time datetime="${esc(verified)}">${esc(longDate(verified))}</time></p>
<div class="status-bar"><div class="banner" id="metro-update" hidden role="status"><p>A new version of this guide is ready.</p><button class="chip" type="button">Tap to refresh</button></div>
<p class="offline-note" id="metro-offline-ready" hidden>Saved for offline use. Links marked <span class="net">needs internet</span> need a connection.</p>
<p class="notice" id="metro-net" hidden role="status">You are offline. This is the saved copy checked on ${esc(longDate(verified))}.</p></div>
</div></div>

<section class="section" id="planner"><div class="section-head"><h2>Plan a journey</h2></div>
<div id="metro-planner" class="planner" data-verified-on="${esc(verified)}"></div>
<div id="metro-planner-fallback" class="fallback"><h3>Use the official fare chart</h3><p>The planner needs JavaScript and has not started. The fare tables below work without it, or use the operators' own charts: ${fallbackLinks}.</p></div></section>

<div class="guide"><h2 class="sr-only">Guide</h2>

<details id="network"><summary>Lines and stations</summary><div class="body"><p class="intro">Three lines, two operators. Only stations marked open are usable. Everything under construction or approved is listed further down and is not routable.</p>
<p class="notice">Maha Metro's homepage counts ${esc(homeStats.lines)} lines and ${esc(homeStats.total_stations)} stations (${esc(homeStats.operational_stations)} operational, ${esc(homeStats.underground_stations)} underground) over ${esc(homeStats.network_km)} km, counting District Court on both lines. Line 3 is run separately by PITCMRL.</p>
<div class="grid3">${model.lines.map(lineCard).join('')}</div>
<ul class="legend"><li><span class="tag tag-open">Open</span> confirmed open on the operator's own page</li><li><span class="tag tag-media">Reported open (media)</span> news reports only; the operator publishes no open/closed list. The planner lets you pick these stations and says so</li><li><span class="tag tag-media-closed">Reported not open yet (media)</span> same, and the planner will not route to it</li><li><span class="tag tag-not">Listed, not open</span> listed by the operator without an Open tag</li></ul>
<h3>Not open: approved or planned extensions</h3>
<ul class="facts-list"><li><strong>Line 1A, PCMC to Nigdi</strong> (Chinchwad, Akurdi, Nigdi, Bhakti Shakti), about 4.4 km. Approved, not built or open.</li><li><strong>Line 1B, Swargate to Katraj</strong> (Market Yard, Padmavati, Katraj), about 5.5 km, 3 underground stations. Approved, not built or open.</li><li><strong>Vanaz to Chandni Chowk and Ramwadi to Wagholi</strong> (Aqua extensions), announced in an operator social media post from June 2025 and absent from the project profile page. Not open. Ramwadi to Wagholi is the corridor that would eventually serve Kharadi.</li></ul>
<p class="note">${ext(P.mahametro_project_profile, 'Operator project profile')}. None of these is in the planner or the fare tables.</p></div></details>

<details id="tickets"><summary>Buying a ticket</summary><div class="body"><p class="intro">Simplest first. Maha Metro and Line 3 sell tickets separately.</p>
<ol class="steps-list">
<li><div><p><strong>WhatsApp e-ticket (Lines 1 and 2).</strong> The operator's homepage says to send "Hi" to book your e-ticket. ${ext(tk.maha_metro.whatsapp.url, 'Open WhatsApp')}</p><p class="note">Line 3: its operator lists QR tickets through WhatsApp and its own app, but publishes no WhatsApp number on the pages we checked, so we do not list one. Some media reports say the same number offers a Line 3 option; that is unconfirmed.</p></div></li>
<li><div><p><strong>The Pune Metro app (Lines 1 and 2).</strong> Listed on the operator's homepage with store badges. Line 3 lists its own Line 3 app on its passenger amenities page.</p></div></li>
<li><div><p><strong>Station counters and ticket vending machines.</strong> Line 3's operator says tickets are sold by manual counter at every station and by ticket vending machine. Lines 1 and 2: ${esc(tk.maha_metro.station)}.</p></div></li>
<li><div><p><strong>One Pune Card (NCMC RuPay, tap in and tap out).</strong> Tap at the entry gate and again at the exit; the fare for the stations you travelled is deducted from the chip balance. KYC card: issue fee Rs ${esc(tk.maha_metro.one_pune_card.issuance_fee_inr)}, yearly Rs ${esc(tk.maha_metro.one_pune_card.annual_maintenance_inr)}, minimum top-up Rs ${esc(tk.maha_metro.one_pune_card.min_topup_inr)}, chip balance up to Rs ${esc(tk.maha_metro.one_pune_card.max_chip_balance_inr)}, online top-up fee ${esc(tk.maha_metro.one_pune_card.online_topup_fee)}. ${esc(tk.maha_metro.one_pune_card.daily_contactless_limit)}. ${ext(tk.maha_metro.one_pune_card.source, 'One Pune Card page')}</p><p class="note">Non-KYC card: ${esc(tk.maha_metro.one_pune_card_non_kyc.issuance_fee)}, yearly ${esc(tk.maha_metro.one_pune_card_non_kyc.annual_fee)}, total balance up to Rs ${esc(tk.maha_metro.one_pune_card_non_kyc.max_total_balance_inr)}. ${ext(tk.maha_metro.one_pune_card_non_kyc.source, 'Non-KYC card page')} Line 3's operator lists NCMC cards, including the One Pune Card, among its ticket options.</p></div></li>
</ol></div></details>

<details id="fares"><summary>Fares and discounts</summary><div class="body"><p class="intro">Lines 1 and 2 are one fare system: Rs ${esc(mm.min)} to Rs ${esc(mm.max)}. Line 3 is a separate fare system: Rs ${esc(l3.min)} to Rs ${esc(l3.max)}. There is no published combined fare for a trip across both, so the planner shows them separately and never adds them up.</p>
<h3>Discounts the operator publishes</h3><ul class="disc">${disc}</ul>
<p class="note">${esc(data.discounts.unverified)}</p>
<details id="fare-maha"><summary>Full fare table: Lines 1 and 2 (Maha Metro), Rs</summary>
<p class="note">Read from the operator's fare chart image on ${esc(longDate(verified))}. Rows are the station you board; columns are the station you get off. A <strong>?</strong> means the operator's own chart prints a different fare in each direction for that pair, so we do not show either number as the fare: ${esc(String(model.disputed.length))} pairs (${disputedList}). Check the official chart for those. ${ext(P.mahametro_fare_chart_page, 'Operator fare chart')}</p>
<div class="fare-scroll" tabindex="0" role="region" aria-label="Maha Metro fare table"><table class="fare"><caption class="sr-only">Maha Metro fares in rupees between every pair of stations</caption><thead><tr><th scope="col">From \\ To</th>${mahaHead}</tr></thead><tbody>${mahaRows}</tbody></table></div></details>
<details id="fare-line3"><summary>Full fare table: Line 3 (Pink), Rs</summary>
<p class="note">Read from the operator's fare chart image. The chart covers all ${pinkNames.length} stations, including ones reported not open yet. ${ext(P.line3_fare_table_page, 'Operator fare table')}</p>
<div class="fare-scroll" tabindex="0" role="region" aria-label="Line 3 fare table"><table class="fare fare-line3"><caption class="sr-only">Line 3 fares in rupees between every pair of stations</caption><thead><tr><th scope="col">From \\ To</th>${pinkHead}</tr></thead><tbody>${pinkRows}</tbody></table></div></details></div></details>

<details id="timings"><summary>Timings</summary><div class="body"><p class="intro">Timetable level only, from the operators' timetable images. Per-station first and last train times are not published.</p>
<div class="tt-wrap"><table class="tt"><caption class="sr-only">Service hours and frequency by line</caption><thead><tr><th scope="col"></th><th scope="col">Lines 1 and 2 (Maha Metro)</th><th scope="col">Line 3 (Pink)</th></tr></thead><tbody>
<tr><th scope="row">Service</th><td>${esc(tm.maha_metro.service_hours)}. Effective from ${esc(longDate(tm.maha_metro.effective_from))}.</td><td>First train ${esc(tm.line3.first_train)}. Last train ${esc(tm.line3.last_train)}.</td></tr>
<tr><th scope="row">Peak</th><td>${esc(tm.maha_metro.peak.windows.join(' and '))}: every ${esc(tm.maha_metro.peak.headway_min)} minutes</td><td>${esc(tm.line3.peak.windows.join(' and '))}: ${esc(tm.line3.peak.headway)}</td></tr>
<tr><th scope="row">Off-peak</th><td>${esc(tm.maha_metro.off_peak.windows.join(', '))}: every ${esc(tm.maha_metro.off_peak.headway_min)} minutes</td><td>${esc(tm.line3.off_peak.windows.join(', '))}: every ${esc(tm.line3.off_peak.headway_min)} minutes</td></tr>
<tr><th scope="row">End to end</th><td>Purple ${esc(data.lines[0].end_to_end_min)} minutes; Aqua ${esc(data.lines[1].end_to_end_min)} minutes</td><td>About ${esc(ps.end_to_end_min)} minutes</td></tr></tbody></table></div>
<p class="note">${esc(tm.line3.note)} ${ext(P.mahametro_timetable_page, 'Maha Metro timetable')} ${ext(P.line3_timetable_page, 'Line 3 timetable')}</p></div></details>

<details id="interchange"><summary>Changing at District Court</summary><div class="body"><p class="intro">One station where Purple, Aqua and Line 3 meet.</p>
<ul class="facts-list"><li><strong>Purple and Aqua:</strong> ${esc(data.interchange.within_mahametro)} The planner prices the whole trip from the Maha Metro fare table.</li><li><strong>Line 3:</strong> Line 3 ends at District Court, Pune. The Line 3 operator says it has interchanges with Lines 1 and 2. It is a different operator with a separate fare system.</li></ul>
<p class="notice"><strong>Not confirmed by either operator:</strong> media reports say a trip across the two systems currently needs two QR codes, that one NCMC card works on both, and that a single integrated ticket has been announced. How a single trip across both systems is charged is not published, so the planner shows each system's leg separately and no combined fare. Verify the current state with the operators before you travel.</p>
<p class="note">Line 3's "Shivaji Nagar" station is not confirmed to be the same physical station as Line 1's "Shivaji Nagar", so the planner treats them as two stations and does not derive a change between them.</p></div></details>

<details id="practical"><summary>Help and contacts</summary><div class="body">
<ul class="facts-list"><li><strong>Maha Metro customer care:</strong> <a href="tel:${esc(ops.maha_metro.helpline)}">${esc(ops.maha_metro.helpline)}</a> (toll free), ${esc(ops.maha_metro.email)}</li><li><strong>Line 3 (PITCMRL):</strong> <a href="tel:${esc(ops.pitcmrl.helpline.replace(/-/g, ''))}">${esc(ops.pitcmrl.helpline)}</a>, ${esc(ops.pitcmrl.email)}</li><li><strong>One Pune Card call centre:</strong> ${esc(tk.maha_metro.one_pune_card.call_center)}</li><li><strong>Gates:</strong> both operators run automatic fare gates. The pages we checked do not describe QR scanning steps, and neither operator publishes ticket validity rules there, so we state none.</li><li><strong>Bicycles</strong> are not permitted on Line 3, per its homepage.</li><li><strong>Not covered:</strong> live train positions, arrival predictions, PMPML buses and per-station first or last trains.</li></ul></div></details>

<details id="areas"><summary>Which station for my area?</summary><div class="body"><p class="intro">Common areas matched to the closest stations from OpenStreetMap coordinates. No walking times: check the last stretch on a map.</p>
<div class="search"><label class="sr-only" for="area-q">Search areas</label><input id="area-q" type="search" placeholder="Search an area, for example Kharadi" autocomplete="off"></div>
<p class="note" id="area-count" role="status"></p>
<div class="grid3">${areas.areas.map(areaCard).join('')}</div>
<p class="note">Method: ${esc(areas.method)}</p></div></details>

<details id="sources"><summary>Sources and checks</summary><div class="body"><p class="intro">Checked on ${esc(longDate(verified))} (${esc(data.timezone)}). Operator pages first; nothing here is invented.</p>
<h3>Confirmed on the date above</h3><ul class="facts-list">${data.verification.confirmed.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
<h3>Corrections made when re-checking</h3><ul class="facts-list">${mm.corrections.map((c) => `<li><strong>${esc(c.cell)}:</strong> ${esc(c.detail)}</li>`).join('')}</ul>
<h3>Not available or not confirmed</h3><ul class="facts-list">${data.verification.not_available.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
${srcs}
<h3>Area reference points (OpenStreetMap)</h3><ul class="src-list">${areas.areas.flatMap((a) => a.references.map((r) => `<li>${ext(r.source, `${a.name}: ${r.label}`)}</li>`)).join('')}</ul>
<p class="note">Map data in the area directory is © OpenStreetMap contributors. Peak Pune is not affiliated with either operator.</p></div></details>
</</div>
</div>`;
}

// Builds the guide page and its files in memory. The page is an Astro route (via scripts/build.mjs);
// the hashed CSS/JS, the Gleam planner bundle and the service worker are returned as `files` and written beside it.
// HTML links stay root-relative because build.mjs applies the site base path; the worker's URLs are prefixed here.
export function buildMetroGuide({ ctx }) {
  const { esc, page, assetUrl, BASE, SITE_URL } = ctx;
  const data = loadMetro(), model = buildModel(data);
  const areas = JSON.parse(read('data/metro/areas.json'));
  const files = {};
  const css = read('site/metro/metro.css'), js = read('public/lib/metro-guide.js');
  const cssName = `metro.${hash(css)}.css`, jsName = `guide.${hash(js)}.js`;
  files[cssName] = css; files[jsName] = js;
  let plannerName = null;
  if (existsSync(join(root, PLANNER_BUNDLE))) { const b = readFileSync(join(root, PLANNER_BUNDLE)); plannerName = `planner.${hash(b)}.js`; files[plannerName] = b; }
  const main = renderGuideMain({ data, model, areas, esc });
  const title = 'Pune Metro guide and journey planner: lines, stations, fares, timings | Peak Pune';
  const description = `Pune Metro lines, stations, tickets, fares and timings with an offline journey planner, last verified ${longDate(data.verified_on)}. Timetable information only, no live trains.`;
  let html = page({ path: GUIDE_PATH, title, description, main, crumbs: [['Pune Metro guide', GUIDE_PATH]], ld: [{ '@type': 'WebPage', '@id': SITE_URL + GUIDE_PATH, url: SITE_URL + GUIDE_PATH, name: title, description, dateModified: data.verified_on, inLanguage: 'en-IN', isPartOf: { '@id': `${SITE_URL}/#site` } }] });
  html = html.replace('</head>', `<link rel="stylesheet" href="${GUIDE_PATH}${cssName}">\n</head>`).replace('</body>', `<script type="module" src="${GUIDE_PATH}${jsName}"></script>${plannerName ? `\n<script type="module" src="${GUIDE_PATH}${plannerName}"></script>` : ''}\n</body>`);
  // Precache exactly what the page references, plus the fonts its stylesheet pulls in.
  const refs = [...html.matchAll(/(?:href|src)="([^"#]+)"/g)].map((m) => m[1]).filter((u) => u.startsWith('/') && !u.startsWith('//') && /\.(css|js|ttf|svg|webmanifest)(\?|$)/.test(u));
  const fontUrls = [...read('public/tokens.css').matchAll(/url\('(fonts\/[^']+)'\)/g)].map((m) => `/${m[1]}`);
  const urls = [...new Set([GUIDE_PATH, ...refs, ...fontUrls])];
  const bytes = (u) => { const path = u.split('?')[0]; if (path === GUIDE_PATH) return Buffer.from(html); if (path.startsWith(GUIDE_PATH)) return Buffer.from(files[path.slice(GUIDE_PATH.length)]); const f = join(root, 'public', path.slice(1)); return existsSync(f) ? readFileSync(f) : Buffer.from(u); };
  const version = hash(Buffer.concat(urls.map(bytes)));
  files['sw.js'] = read('site/metro/sw.template.js').replace('__CACHE__', `pp-metro-${version}`).replace('__PRECACHE__', JSON.stringify(urls.map((u) => BASE + u), null, 1)).replace('__GUIDE__', `${BASE}${GUIDE_PATH}`);
  return { html, files, verifiedOn: data.verified_on, version, planner: plannerName };
}

// Replaces the guide's asset folder (stale hashed files must not linger).
export function writeMetroAssets(dir, files) {
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
}
