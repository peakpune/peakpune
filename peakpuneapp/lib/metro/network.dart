// Dart port of scripts/metro-model.mjs (buildModel) and the Network type in
// metro/src/peakpune_metro/types.gleam. Everything is derived from metro.json
// and areas.json; no station, fare or status is typed in here.

/// metro-model.mjs `slug`: "R.T.O., Pune" -> "rto-pune".
String metroSlug(String name) => name
    .toLowerCase()
    .replaceAll('.', '')
    .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
    .replaceAll(RegExp(r'^-+|-+$'), '');

enum MetroOperator { mahaMetro, pitCmrl }

enum StopState { open, notOpen, closed, unknown }

enum StatusSource { operator, media, other }

class StopStatus {
  const StopStatus({required this.state, required this.source, required this.verified, required this.asOf, this.sourceUrl});
  final StopState state;
  final StatusSource source;
  final bool verified;
  final String asOf;
  final String? sourceUrl;
}

/// A station's place on one line, in running order.
class Stop {
  const Stop(this.station, this.status);
  final String station;
  final StopStatus status;
}

class MetroLine {
  const MetroLine({
    required this.id,
    required this.name,
    required this.operator,
    required this.firstTerminus,
    required this.lastTerminus,
    required this.stops,
    this.lengthKm,
    this.endToEndMin,
  });
  final String id;
  final String name;
  final MetroOperator operator;
  final String firstTerminus;
  final String lastTerminus;
  final List<Stop> stops;
  final num? lengthKm;
  final num? endToEndMin;

  /// Line colours used by the site (LINE_COLOUR in metro-model.mjs).
  int get colour => switch (id) {
        'purple' => 0xFF8A3A8E,
        'aqua' => 0xFF1FA5D8,
        _ => 0xFFD9548F,
      };
}

class MetroStation {
  MetroStation(this.id, this.name);
  final String id;
  final String name;
  final Set<String> names = {};
  final List<String> lines = [];
}

/// `rows[i][j]` is the fare from `order[i]` to `order[j]`, in rupees.
class FareTable {
  const FareTable(this.order, this.rows);
  final List<String> order;
  final List<List<int>> rows;
}

class DisputedPair {
  const DisputedPair(this.a, this.b, this.printedAB, this.printedBA);
  final String a;
  final String b;
  final int printedAB;
  final int printedBA;
}

class AreaStation {
  const AreaStation(this.id, this.straightLineKm);
  final String id;
  final num straightLineKm;
}

class MetroArea {
  const MetroArea({required this.id, required this.name, required this.aliases, required this.note, required this.hasStation, required this.stations});
  final String id;
  final String name;
  final List<String> aliases;
  final String note;
  final bool hasStation;

  /// Closest first by straight line. Distances are kept for audit, not shown.
  final List<AreaStation> stations;
}

enum FareSystem { maha, pink }

class MetroNetwork {
  MetroNetwork._({
    required this.raw,
    required this.verifiedOn,
    required this.lines,
    required this.stations,
    required this.mahaFares,
    required this.pinkFares,
    required this.disputed,
    required this.areas,
    required this.codeToId,
  });

  /// The parsed metro.json, kept for the validator and the guide text.
  final Map<String, dynamic> raw;
  final String verifiedOn;
  final List<MetroLine> lines;
  final Map<String, MetroStation> stations;
  final FareTable mahaFares;
  final FareTable pinkFares;

  /// Pairs the operator's chart prints differently in each direction. Never shown as a fare.
  final List<DisputedPair> disputed;
  final List<MetroArea> areas;
  final Map<String, String> codeToId;

  Map<String, dynamic> get operators => raw['operators'] as Map<String, dynamic>;
  Map<String, dynamic> get provenance => raw['provenance'] as Map<String, dynamic>;
  Map<String, dynamic> get timetables => raw['timetables'] as Map<String, dynamic>;
  String? get mahaWhatsapp => (operators['maha_metro'] as Map)['whatsapp_eticket'] as String?;
  String? get pinkWhatsapp => (operators['pitcmrl'] as Map)['whatsapp_eticket'] as String?;
  String get mahaFareChartUrl => provenance['mahametro_fare_chart_page'] as String;
  String get pinkFareChartUrl => provenance['line3_fare_table_page'] as String;

  StopStatus? statusOn(String lineId, String station) {
    final line = lines.where((l) => l.id == lineId).firstOrNull;
    return line?.stops.where((s) => s.station == station).firstOrNull?.status;
  }

  /// Station id for a name on a line. District Court is one station on all three
  /// lines; Shivaji Nagar on Line 3 is not assumed to be the Purple-line station.
  static String stationIdFor(Map<String, dynamic> data, String lineId, String name) {
    final over = <String, dynamic>{
      ...(data['station_id_overrides'] as Map<String, dynamic>? ?? const {}),
      if (lineId == 'pink_line3') ...(data['station_id_overrides_pink'] as Map<String, dynamic>? ?? const {}),
    };
    return (over[name] as String?) ?? metroSlug(name);
  }

  factory MetroNetwork.fromJson(Map<String, dynamic> data, Map<String, dynamic> areasDoc) {
    final verifiedOn = data['verified_on'] as String;
    final stations = <String, MetroStation>{};
    final lines = <MetroLine>[];
    for (final l in (data['lines'] as List).cast<Map<String, dynamic>>()) {
      final lineId = l['id'] as String;
      final order = (l['station_order'] as List).cast<String>();
      final names = [...order];
      final notOpenList = (l['listed_but_not_open'] as List? ?? const []).cast<Map<String, dynamic>>();
      // Listed-but-not-open stations (Range Hill) sit in the order so adjacency is honest.
      for (final nb in notOpenList) {
        final at = names.indexOf(nb['after'] as String);
        if (at < 0) throw FormatException('listed_but_not_open: ${nb['after']} not on $lineId');
        names.insert(at + 1, nb['name'] as String);
      }
      final st = l['station_status'] as Map<String, dynamic>;
      StatusSource src(Object? s) => switch (s) { 'operator' => StatusSource.operator, 'media' => StatusSource.media, _ => StatusSource.other };
      final stops = <Stop>[];
      for (final name in names) {
        final id = stationIdFor(data, lineId, name);
        final s = stations.putIfAbsent(id, () => MetroStation(id, name));
        s.names.add(name);
        if (!s.lines.contains(lineId)) s.lines.add(lineId);
        final notOpen = notOpenList.where((n) => n['name'] == name).firstOrNull;
        final StopStatus status;
        if (notOpen != null) {
          status = StopStatus(state: StopState.notOpen, source: src(notOpen['status_source']), verified: notOpen['verified'] == true, asOf: verifiedOn, sourceUrl: notOpen['source'] as String?);
        } else if (st['open'] is List) {
          final open = (st['open'] as List).contains(name), closed = (st['closed'] as List).contains(name);
          status = StopStatus(
            state: open ? StopState.open : closed ? StopState.closed : StopState.unknown,
            source: src(st['status_source']),
            verified: st['verified'] == true,
            asOf: st['as_of'] as String,
            sourceUrl: 'https://punerimetro.in/route/station-list',
          );
        } else {
          status = StopStatus(state: StopState.open, source: src(st['status_source']), verified: st['verified'] == true, asOf: st['as_of'] as String, sourceUrl: st['source'] as String?);
        }
        stops.add(Stop(id, status));
      }
      final termini = (l['termini'] as List?)?.cast<String>() ?? [order.first, order.last.replaceAll(RegExp(r', Pune$'), '')];
      lines.add(MetroLine(
        id: lineId,
        name: l['name'] as String,
        operator: l['operator'] == 'pitcmrl' ? MetroOperator.pitCmrl : MetroOperator.mahaMetro,
        firstTerminus: termini[0],
        lastTerminus: termini[1],
        stops: stops,
        lengthKm: l['length_km'] as num?,
        endToEndMin: l['end_to_end_min'] as num?,
      ));
    }
    // Maha Metro fare matrix: code -> station id.
    final codeToId = <String, String>{};
    for (final l in (data['lines'] as List).cast<Map<String, dynamic>>().where((x) => x['id'] == 'purple' || x['id'] == 'aqua')) {
      (l['station_codes'] as Map<String, dynamic>).forEach((name, code) {
        final id = stationIdFor(data, l['id'] as String, name);
        if (l['id'] == 'aqua' && id == 'district-court') {
          codeToId['CVC_AQ'] = id;
        } else {
          codeToId[code as String] = id;
        }
      });
    }
    final mm = (data['fares'] as Map<String, dynamic>)['maha_metro'] as Map<String, dynamic>;
    List<List<int>> matrix(Object? m) => (m as List).map((r) => (r as List).map((v) => (v as num).toInt()).toList()).toList();
    final mahaIds = (mm['station_order'] as List).map((c) => codeToId[c] ?? '?$c').toList();
    final pink = lines.firstWhere((l) => l.id == 'pink_line3');
    final disputed = [
      for (final p in ((mm['disputed_fare_pairs'] as Map)['pairs'] as List).cast<Map<String, dynamic>>())
        DisputedPair(codeToId[p['from']] ?? '?', codeToId[p['to']] ?? '?', (p['printed_from_to'] as num).toInt(), (p['printed_to_from'] as num).toInt())
    ];
    final areas = [
      for (final a in (areasDoc['areas'] as List).cast<Map<String, dynamic>>())
        MetroArea(
          id: a['id'] as String,
          name: a['name'] as String,
          aliases: (a['aliases'] as List? ?? const []).cast<String>(),
          note: a['note'] as String? ?? '',
          hasStation: a['has_station'] == true,
          stations: [for (final s in (a['stations'] as List).cast<Map<String, dynamic>>()) AreaStation(s['id'] as String, s['straight_line_km'] as num)],
        )
    ];
    return MetroNetwork._(
      raw: data,
      verifiedOn: verifiedOn,
      lines: lines,
      stations: stations,
      mahaFares: FareTable(mahaIds, matrix(mm['matrix'])),
      pinkFares: FareTable(pink.stops.map((s) => s.station).toList(), matrix(((data['fares'] as Map)['line3'] as Map)['matrix'])),
      disputed: disputed,
      areas: areas,
      codeToId: codeToId,
    );
  }
}
