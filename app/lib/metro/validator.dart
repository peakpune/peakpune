// Dart port of validateMetro and validateAreas from scripts/metro-model.mjs.
// Every failure is a string; an empty list means the data is self-consistent.
// It cannot prove a real-world fare or status is right; that is what verified_on
// and the sources are for.
import 'network.dart';

final _isDate = RegExp(r'^\d{4}-\d{2}-\d{2}$');
bool _date(Object? s) => s is String && _isDate.hasMatch(s) && DateTime.tryParse(s) != null;
bool _https(Object? s) => s is String && Uri.tryParse(s)?.scheme == 'https';

const _mahaLines = ['purple', 'aqua'];

List<String> validateMetro(Map<String, dynamic> data, Map<String, dynamic> areasDoc) {
  final errs = <String>[];
  void err(String m) => errs.add(m);
  if (!_date(data['verified_on'])) err('verified_on must be YYYY-MM-DD');
  if (data['timezone'] != 'Asia/Kolkata') err('timezone must be Asia/Kolkata');
  (data['provenance'] as Map<String, dynamic>? ?? const {}).forEach((k, v) {
    for (final u in v is List ? v : [v]) {
      if (!_https(u)) err('provenance.$k is not an https URL');
    }
  });
  final MetroNetwork model;
  try {
    model = MetroNetwork.fromJson(data, areasDoc);
  } catch (e) {
    return ['model: $e'];
  }
  final stationIds = model.stations.keys.toSet();
  for (final l in model.lines) {
    final order = l.stops.map((s) => s.station).toList();
    if (order.toSet().length != order.length) err('${l.id}: duplicate station in order');
    if (order.length < 2) err('${l.id}: fewer than two stations');
    for (final s in l.stops) {
      if (s.status.state == StopState.unknown) err('${l.id}:${s.station}: status state unknown');
      if (s.status.source == StatusSource.other) err('${l.id}:${s.station}: status_source');
      if (s.status.source == StatusSource.media && s.status.verified) err('${l.id}:${s.station}: media-sourced status cannot be verified:true');
      if (!_date(s.status.asOf)) err('${l.id}:${s.station}: as_of date');
    }
  }
  final rawLines = (data['lines'] as List).cast<Map<String, dynamic>>();
  for (final l in rawLines.where((x) => _mahaLines.contains(x['id']))) {
    final codes = l['station_codes'] as Map<String, dynamic>;
    for (final name in (l['station_order'] as List).cast<String>()) {
      if (codes[name] == null) err('${l['id']}: no station code for $name');
    }
    for (final name in codes.keys) {
      if (!(l['station_order'] as List).contains(name)) err('${l['id']}: station code for unknown station $name');
    }
  }
  // Maha fare matrix.
  final mm = (data['fares'] as Map<String, dynamic>)['maha_metro'] as Map<String, dynamic>;
  final order = (mm['station_order'] as List).cast<String>();
  final m = model.mahaFares.rows;
  final n = order.length;
  for (final id in model.mahaFares.order) {
    if (!stationIds.contains(id)) err('fare table references unknown station $id');
  }
  final expected = {
    for (final l in model.lines.where((l) => _mahaLines.contains(l.id)))
      for (final s in l.stops)
        if (s.status.state == StopState.open) s.station
  };
  final maha = model.mahaFares.order.toSet();
  for (final id in expected) {
    if (!maha.contains(id)) err('open Maha station $id has no fare row');
  }
  for (final id in maha) {
    if (!expected.contains(id)) err('fare row $id is not an open Maha station');
  }
  final pairs = ((mm['disputed_fare_pairs'] as Map)['pairs'] as List).cast<Map<String, dynamic>>();
  final disputed = {for (final p in pairs) '${p['from']}>${p['to']}'};
  bool listed(String a, String b) => disputed.contains('$a>$b') || disputed.contains('$b>$a');
  if (m.length != n || m.any((r) => r.length != n)) {
    err('maha matrix is not ${n}x$n');
  } else {
    for (var i = 0; i < n; i++) {
      if (m[i][i] != 0) err('maha diagonal ${order[i]}');
      for (var j = 0; j < n; j++) {
        if (![0, 10, 15, 20, 25, 30, 35].contains(m[i][j])) err('maha fare $i,$j = ${m[i][j]}');
        if (i < j && m[i][j] != m[j][i] && !listed(order[i], order[j])) err('maha unlisted asymmetric pair ${order[i]}/${order[j]}');
      }
    }
    for (final p in pairs) {
      final i = order.indexOf(p['from'] as String), j = order.indexOf(p['to'] as String);
      if (i < 0 || j < 0) {
        err('disputed pair uses unknown code ${p['from']}/${p['to']}');
        continue;
      }
      if (m[i][j] != p['printed_from_to'] || m[j][i] != p['printed_to_from']) err('disputed pair ${p['from']}/${p['to']} does not match matrix');
      if (p['printed_from_to'] == p['printed_to_from']) err('disputed pair ${p['from']}/${p['to']} is symmetric');
    }
    // CVC and CVC_AQ are one physical station: rows and columns agree except at disputed pairs.
    final a = order.indexOf('CVC'), b = order.indexOf('CVC_AQ');
    for (var k = 0; k < n; k++) {
      if (k == a || k == b) continue;
      final code = order[k];
      final isListed = listed(code, 'CVC_AQ') || listed(code, 'CVC');
      if ((m[a][k] != m[b][k] || m[k][a] != m[k][b]) && !isListed) err('CVC and CVC_AQ differ at $code and the pair is not listed as disputed');
    }
    final vals = m.expand((r) => r).where((v) => v > 0);
    if (vals.reduce((x, y) => x < y ? x : y) != mm['min'] || vals.reduce((x, y) => x > y ? x : y) != mm['max']) err('maha min/max do not match the matrix');
  }
  // Line 3 fare matrix.
  final line3 = (data['fares'] as Map<String, dynamic>)['line3'] as Map<String, dynamic>;
  final p = model.pinkFares.rows, pn = model.pinkFares.order.length;
  if (p.length != pn || p.any((r) => r.length != pn)) {
    err('line3 matrix is not ${pn}x$pn');
  } else {
    for (var i = 0; i < pn; i++) {
      for (var j = 0; j < pn; j++) {
        if (![12, 25, 37, 43, 49, 62].contains(p[i][j])) err('line3 fare $i,$j = ${p[i][j]}');
        if (p[i][j] != p[j][i]) err('line3 asymmetric $i,$j');
      }
    }
    final vals = p.expand((r) => r);
    if (vals.reduce((x, y) => x < y ? x : y) != line3['min'] || vals.reduce((x, y) => x > y ? x : y) != line3['max']) err('line3 min/max do not match the matrix');
  }
  // Line 3 open/closed lists partition the order.
  final pinkRaw = rawLines.firstWhere((l) => l['id'] == 'pink_line3');
  final st = pinkRaw['station_status'] as Map<String, dynamic>;
  final all = [...(st['open'] as List? ?? const []), ...(st['closed'] as List? ?? const [])];
  final pinkOrder = (pinkRaw['station_order'] as List).cast<String>();
  if (all.toSet().length != all.length || all.length != pinkOrder.length || !pinkOrder.every(all.contains)) err('line3 open/closed lists do not partition the station order');
  // Interchange: stations on several lines are exactly the declared one.
  final ic = data['interchange'] as Map<String, dynamic>;
  final multi = model.stations.values.where((s) => s.lines.length > 1).toList();
  if (multi.length != 1 || multi.first.id != metroSlug(ic['station'] as String)) {
    err('multi-line stations ${multi.map((s) => s.id)} != declared ${ic['station']}');
  } else if (([...multi.first.lines]..sort()).join() != ([...(ic['lines'] as List).cast<String>()]..sort()).join()) {
    err('interchange lines do not match membership');
  }
  final sj = model.stations.values.where((s) => s.id.startsWith('shivaji-nagar')).toList();
  if (sj.length != 2 || sj.any((s) => s.lines.length != 1)) err('Shivaji Nagar must stay two separate stations');
  // Lines connect through interchanges.
  final seen = {model.lines.first.id};
  var grew = true;
  while (grew) {
    grew = false;
    for (final s in model.stations.values) {
      if (s.lines.any(seen.contains)) {
        for (final x in s.lines) {
          if (seen.add(x)) grew = true;
        }
      }
    }
  }
  if (seen.length != model.lines.length) err('lines are not connected through interchanges');
  // Approved extensions must not appear as stations.
  for (final nm in ['Nigdi', 'Katraj', 'Wagholi', 'Chandni Chowk', 'Akurdi', 'Chinchwad', 'Market Yard', 'Padmavati']) {
    if (model.stations.values.any((s) => s.names.contains(nm))) err('unbuilt extension station $nm is in the network');
  }
  // Operators.
  final ops = data['operators'] as Map<String, dynamic>;
  if ((ops['maha_metro'] as Map)['whatsapp_eticket'] != 'https://wa.me/9420101990') err('Maha Metro WhatsApp link changed');
  if ((ops['pitcmrl'] as Map)['whatsapp_eticket'] != null) err('Line 3 WhatsApp number must stay null until verified');
  for (final l in rawLines) {
    if (ops[l['operator']] == null) err('${l['id']}: unknown operator');
  }
  // Discounts must be sourced.
  for (final d in ((data['discounts'] as Map)['items'] as List).cast<Map<String, dynamic>>()) {
    if (!_https(d['source']) || d['verified'] != true) err('discount ${d['id']} lacks a verified https source');
  }
  return errs;
}

List<String> validateAreas(Map<String, dynamic> areasDoc, Map<String, dynamic> data) {
  final errs = <String>[];
  final ids = MetroNetwork.fromJson(data, areasDoc).stations.keys.toSet();
  if (areasDoc['verified_on'] != data['verified_on']) errs.add('areas verified_on differs from the metro dataset');
  for (final a in (areasDoc['areas'] as List).cast<Map<String, dynamic>>()) {
    num last = -1;
    final refs = (a['references'] as List? ?? const []).cast<Map<String, dynamic>>();
    if (a['note'] == null || (a['note'] as String).isEmpty || refs.isEmpty) errs.add('${a['id']}: missing note or reference point');
    for (final r in refs) {
      if (!RegExp(r'^https://www\.openstreetmap\.org/').hasMatch(r['source'] as String? ?? '')) errs.add('${a['id']}: reference source');
    }
    for (final s in (a['stations'] as List).cast<Map<String, dynamic>>()) {
      if (!ids.contains(s['id'])) errs.add('${a['id']}: unknown station ${s['id']}');
      if ((s['straight_line_km'] as num) < last) errs.add('${a['id']}: stations are not closest-first at ${s['id']}');
      last = s['straight_line_km'] as num;
    }
    if (a['has_station'] == true && (a['stations'] as List).isEmpty) errs.add('${a['id']}: has_station but no stations');
    if (RegExp('walk|minute', caseSensitive: false).hasMatch(a['note'] as String? ?? '')) errs.add('${a['id']}: note states a walking or travel time');
  }
  return errs;
}
