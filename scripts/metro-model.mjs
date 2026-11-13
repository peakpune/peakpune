// Derives a normalised network model from data/metro/metro.json and validates it.
// Used by the guide page generator, the Gleam data generator and the tests.
// No dependencies. Nothing here computes journeys: routing lives in the Gleam planner.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const METRO_DATA_PATH = join(root, 'data/metro/metro.json');
export const loadMetro = (path = METRO_DATA_PATH) => JSON.parse(readFileSync(path, 'utf8'));

export const slug = (name) =>
  String(name).toLowerCase().replace(/\./g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const MAHA_LINES = ['purple', 'aqua'];

// Station id for a name on a given line. District Court is one physical station on all three lines;
// Shivaji Nagar on Line 3 is NOT assumed to be the Purple-line station.
export function stationIdFor(data, lineId, name) {
  const over = lineId === 'pink_line3' ? { ...data.station_id_overrides, ...data.station_id_overrides_pink } : data.station_id_overrides;
  return over[name] || slug(name);
}

export function buildModel(data) {
  const lines = [];
  const stations = new Map();
  const membership = {}; // `${lineId}:${stationId}` -> status
  const touch = (id, name, lineId) => {
    const s = stations.get(id) || { id, name, names: new Set(), lines: [] };
    s.names.add(name);
    if (!s.lines.includes(lineId)) s.lines.push(lineId);
    stations.set(id, s);
  };
  for (const l of data.lines) {
    const order = [];
    const names = [...l.station_order];
    // Listed-but-not-open stations (Range Hill) sit in the order so adjacency is honest, with a not_open status.
    for (const nb of l.listed_but_not_open || []) {
      const at = names.indexOf(nb.after);
      if (at < 0) throw new Error(`listed_but_not_open: ${nb.after} not on ${l.id}`);
      names.splice(at + 1, 0, nb.name);
    }
    for (const name of names) {
      const id = stationIdFor(data, l.id, name);
      order.push(id);
      touch(id, name, l.id);
      const notOpen = (l.listed_but_not_open || []).find((n) => n.name === name);
      let status;
      if (notOpen) status = { state: 'not_open', statusSource: notOpen.status_source, verified: notOpen.verified, asOf: data.verified_on, source: notOpen.source };
      else if (l.station_status && Array.isArray(l.station_status.open)) {
        const open = l.station_status.open.includes(name), closed = l.station_status.closed.includes(name);
        status = { state: open ? 'open' : closed ? 'closed' : 'unknown', statusSource: l.station_status.status_source, verified: l.station_status.verified, asOf: l.station_status.as_of, source: 'https://punerimetro.in/route/station-list' };
      } else status = { state: 'open', statusSource: l.station_status.status_source, verified: l.station_status.verified, asOf: l.station_status.as_of, source: l.station_status.source };
      membership[`${l.id}:${id}`] = status;
    }
    const first = stationIdFor(data, l.id, l.station_order[0]), last = stationIdFor(data, l.id, l.station_order.at(-1));
    const termini = l.termini || [l.station_order[0], l.station_order.at(-1).replace(/, Pune$/, '')];
    lines.push({ id: l.id, name: l.name, operator: l.operator, termini, order, orderNames: names, firstId: first, lastId: last, lengthKm: l.length_km, endToEndMin: l.end_to_end_min });
  }
  // Maha Metro fare matrix: code -> station id
  const codeToId = {};
  for (const l of data.lines.filter((x) => MAHA_LINES.includes(x.id))) {
    for (const [name, code] of Object.entries(l.station_codes)) {
      const id = stationIdFor(data, l.id, name);
      if (l.id === 'aqua' && id === 'district-court') codeToId.CVC_AQ = id; else codeToId[code] = id;
    }
  }
  const mm = data.fares.maha_metro;
  const mahaIds = mm.station_order.map((c) => codeToId[c]);
  const pink = lines.find((l) => l.id === 'pink_line3');
  return { verifiedOn: data.verified_on, lines, stations: [...stations.values()].map((s) => ({ ...s, names: [...s.names] })), membership, codeToId, mahaIds, mahaMatrix: mm.fares ?? mm.matrix, pinkIds: pink.order, pinkMatrix: data.fares.line3.matrix, disputed: mm.disputed_fare_pairs.pairs.map((p) => ({ a: codeToId[p.from], b: codeToId[p.to], printedAB: p.printed_from_to, printedBA: p.printed_to_from })) };
}

const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isHttps = (s) => { try { return new URL(s).protocol === 'https:'; } catch { return false; } };

// Build-time validation: every failure is a string. An empty list means the data is self-consistent.
// It cannot prove a real-world fare or status is right; that is what verified_on and the sources are for.
export function validateMetro(data) {
  const errs = [];
  const err = (m) => errs.push(m);
  if (!isDate(data.verified_on)) err('verified_on must be YYYY-MM-DD');
  if (data.timezone !== 'Asia/Kolkata') err('timezone must be Asia/Kolkata');
  for (const [k, v] of Object.entries(data.provenance || {})) for (const u of [].concat(v)) if (!isHttps(u)) err(`provenance.${k} is not an https URL`);
  let model;
  try { model = buildModel(data); } catch (e) { return [`model: ${e.message}`]; }
  const { lines, stations, membership, mahaIds } = model;
  const stationIds = new Set(stations.map((s) => s.id));
  // lines
  for (const l of lines) {
    if (new Set(l.order).size !== l.order.length) err(`${l.id}: duplicate station in order`);
    if (l.order.length < 2) err(`${l.id}: fewer than two stations`);
    for (const id of l.order) if (!membership[`${l.id}:${id}`]) err(`${l.id}: no status for ${id}`);
  }
  for (const [k, s] of Object.entries(membership)) {
    if (!['open', 'not_open', 'closed'].includes(s.state)) err(`${k}: status state ${s.state}`);
    if (typeof s.verified !== 'boolean') err(`${k}: verified flag missing`);
    if (!['operator', 'media'].includes(s.statusSource)) err(`${k}: status_source ${s.statusSource}`);
    if (s.statusSource === 'media' && s.verified) err(`${k}: media-sourced status cannot be verified:true`);
    if (!isDate(s.asOf)) err(`${k}: as_of date`);
  }
  // station codes
  for (const l of data.lines.filter((x) => MAHA_LINES.includes(x.id))) {
    for (const name of l.station_order) if (!l.station_codes[name]) err(`${l.id}: no station code for ${name}`);
    for (const name of Object.keys(l.station_codes)) if (!l.station_order.includes(name)) err(`${l.id}: station code for unknown station ${name}`);
  }
  // Maha fare matrix
  const mm = data.fares.maha_metro, M = mm.matrix, n = mm.station_order.length;
  const mahaStations = new Set(mahaIds);
  for (const id of mahaIds) if (!stationIds.has(id)) err(`fare table references unknown station ${id}`);
  const expectedIds = new Set(lines.filter((l) => MAHA_LINES.includes(l.id)).flatMap((l) => l.order.filter((id) => membership[`${l.id}:${id}`].state === 'open')));
  for (const id of expectedIds) if (!mahaStations.has(id)) err(`open Maha station ${id} has no fare row`);
  for (const id of mahaStations) if (!expectedIds.has(id)) err(`fare row ${id} is not an open Maha station`);
  if (M.length !== n || M.some((r) => r.length !== n)) err(`maha matrix is not ${n}x${n}`);
  else {
    const disputed = new Set(mm.disputed_fare_pairs.pairs.map((p) => `${p.from}>${p.to}`));
    for (let i = 0; i < n; i++) {
      if (M[i][i] !== 0) err(`maha diagonal ${mm.station_order[i]}`);
      for (let j = 0; j < n; j++) {
        if (![0, 10, 15, 20, 25, 30, 35].includes(M[i][j])) err(`maha fare ${i},${j} = ${M[i][j]}`);
        if (i < j && M[i][j] !== M[j][i] && !disputed.has(`${mm.station_order[i]}>${mm.station_order[j]}`) && !disputed.has(`${mm.station_order[j]}>${mm.station_order[i]}`)) err(`maha unlisted asymmetric pair ${mm.station_order[i]}/${mm.station_order[j]}`);
      }
    }
    for (const p of mm.disputed_fare_pairs.pairs) {
      const i = mm.station_order.indexOf(p.from), j = mm.station_order.indexOf(p.to);
      if (i < 0 || j < 0) { err(`disputed pair uses unknown code ${p.from}/${p.to}`); continue; }
      if (M[i][j] !== p.printed_from_to || M[j][i] !== p.printed_to_from) err(`disputed pair ${p.from}/${p.to} does not match matrix`);
      if (p.printed_from_to === p.printed_to_from) err(`disputed pair ${p.from}/${p.to} is symmetric`);
    }
    const a = mm.station_order.indexOf('CVC'), b = mm.station_order.indexOf('CVC_AQ');
    // CVC and CVC_AQ are one physical station, so their rows and columns must agree, except where the
    // chart itself disagrees with itself and the pair is listed as disputed.
    for (let k = 0; k < n; k++) {
      if (k === a || k === b) continue;
      const code = mm.station_order[k];
      const listed = disputed.has(`${code}>CVC_AQ`) || disputed.has(`CVC_AQ>${code}`) || disputed.has(`${code}>CVC`) || disputed.has(`CVC>${code}`);
      if ((M[a][k] !== M[b][k] || M[k][a] !== M[k][b]) && !listed) err(`CVC and CVC_AQ differ at ${code} and the pair is not listed as disputed`);
    }
    const vals = M.flat().filter((v) => v > 0);
    if (Math.min(...vals) !== mm.min || Math.max(...vals) !== mm.max) err('maha min/max do not match the matrix');
  }
  for (const s of mm.spot_checks_passed || []) {
    const m = /^(.+)->(.+) (\d+)$/.exec(s); if (!m) { err(`spot check text ${s}`); continue; }
    const byName = (nm) => { for (const l of data.lines.filter((x) => MAHA_LINES.includes(x.id))) { const nn = Object.keys(l.station_codes).find((k) => k.replace(/\./g, '').replace(/, Pune$/, '').toLowerCase().startsWith(nm.toLowerCase().replace(/\./g, ''))); if (nn) return l.station_codes[nn]; } return null; };
    const ca = byName(m[1]), cb = byName(m[2]);
    if (!ca || !cb) { err(`spot check stations ${s}`); continue; }
    if (M[mm.station_order.indexOf(ca)][mm.station_order.indexOf(cb)] !== Number(m[3])) err(`spot check ${s} does not match the matrix`);
  }
  // Line 3 fare matrix
  const P = data.fares.line3.matrix, pn = model.pinkIds.length;
  if (P.length !== pn || P.some((r) => r.length !== pn)) err(`line3 matrix is not ${pn}x${pn}`);
  else {
    for (let i = 0; i < pn; i++) for (let j = 0; j < pn; j++) {
      if (![12, 25, 37, 43, 49, 62].includes(P[i][j])) err(`line3 fare ${i},${j} = ${P[i][j]}`);
      if (P[i][j] !== P[j][i]) err(`line3 asymmetric ${i},${j}`);
    }
    const vals = P.flat();
    if (Math.min(...vals) !== data.fares.line3.min || Math.max(...vals) !== data.fares.line3.max) err('line3 min/max do not match the matrix');
  }
  // Line 3 status lists partition the order
  const pinkLine = data.lines.find((l) => l.id === 'pink_line3'), st = pinkLine.station_status;
  const all = [...st.open, ...st.closed];
  if (new Set(all).size !== all.length || all.length !== pinkLine.station_order.length || !pinkLine.station_order.every((x) => all.includes(x))) err('line3 open/closed lists do not partition the station order');
  // interchange: stations on several lines are exactly the declared one
  const multi = stations.filter((s) => s.lines.length > 1);
  if (multi.length !== 1 || multi[0].id !== slug(data.interchange.station)) err(`multi-line stations ${multi.map((s) => s.id)} != declared ${data.interchange.station}`);
  else if ([...multi[0].lines].sort().join() !== [...data.interchange.lines].sort().join()) err('interchange lines do not match membership');
  const sj = stations.filter((s) => s.id.startsWith('shivaji-nagar'));
  if (sj.length !== 2 || sj.some((s) => s.lines.length !== 1)) err('Shivaji Nagar must stay two separate stations');
  // line graph is connected through interchanges
  const seen = new Set([lines[0].id]); let grew = true;
  while (grew) { grew = false; for (const s of stations) if (s.lines.some((x) => seen.has(x))) for (const x of s.lines) if (!seen.has(x)) { seen.add(x); grew = true; } }
  if (seen.size !== lines.length) err('lines are not connected through interchanges');
  // approved extensions must not appear as stations
  for (const nm of ['Nigdi', 'Katraj', 'Wagholi', 'Chandni Chowk', 'Akurdi', 'Chinchwad', 'Market Yard', 'Padmavati']) if (stations.some((s) => s.names.includes(nm))) err(`unbuilt extension station ${nm} is in the network`);
  // operators
  const ops = data.operators;
  if (ops.maha_metro.whatsapp_eticket !== 'https://wa.me/9420101990') err('Maha Metro WhatsApp link changed');
  if (ops.pitcmrl.whatsapp_eticket !== null) err('Line 3 WhatsApp number must stay null until verified');
  for (const l of data.lines) if (!ops[l.operator]) err(`${l.id}: unknown operator`);
  // discounts must be sourced
  for (const d of data.discounts.items) if (!isHttps(d.source) || d.verified !== true) err(`discount ${d.id} lacks a verified https source`);
  return errs;
}

// Display helpers shared by the guide and the data generator.
export const OPERATOR_LABEL = { maha_metro: 'Maha Metro', pitcmrl: 'PITCMRL (Line 3)' };
export const LINE_COLOUR = { purple: '#8A3A8E', aqua: '#1FA5D8', pink_line3: '#D9548F' };

// Area directory checks: every station exists, lists are closest-first and honest about stations.
export function validateAreas(areasDoc, data) {
  const errs = []; const model = buildModel(data); const ids = new Set(model.stations.map((s) => s.id));
  if (areasDoc.verified_on !== data.verified_on) errs.push('areas verified_on differs from the metro dataset');
  for (const a of areasDoc.areas) {
    let last = -1;
    if (!a.note || !a.references?.length) errs.push(`${a.id}: missing note or reference point`);
    for (const r of a.references || []) if (!/^https:\/\/www\.openstreetmap\.org\//.test(r.source)) errs.push(`${a.id}: reference source`);
    for (const s of a.stations) {
      if (!ids.has(s.id)) errs.push(`${a.id}: unknown station ${s.id}`);
      if (s.straight_line_km < last) errs.push(`${a.id}: stations are not closest-first at ${s.id}`);
      last = s.straight_line_km;
    }
    // "has a station" must agree with the nearest listed station being genuinely in the area: no area claims a station it does not list
    if (a.has_station && !a.stations.length) errs.push(`${a.id}: has_station but no stations`);
    if (/walk|minute/i.test(a.note)) errs.push(`${a.id}: note states a walking or travel time`);
  }
  return errs;
}
