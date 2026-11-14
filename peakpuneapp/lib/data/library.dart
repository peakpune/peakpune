import 'dart:convert';

import 'package:flutter/services.dart';

import '../metro/network.dart';
import 'models.dart';

/// Everything the app shows, loaded from bundled assets. Nothing is fetched.
class Library {
  Library({
    required this.auditCheckedAt,
    required this.places,
    required this.outdoors,
    required this.events,
    required this.meetups,
    required this.history,
    required this.historyLoaded,
    required this.shoppingAreas,
    required this.shops,
    required this.shoppingLoaded,
    required this.metro,
  });

  /// Date of the publication audit; every published listing carries it as checked_at.
  final DateTime auditCheckedAt;
  final List<Place> places;
  final List<Outdoor> outdoors;
  final List<EventListing> events;
  final List<Meetup> meetups;
  final List<HistoryEntry> history;
  final bool historyLoaded;
  final List<ShoppingArea> shoppingAreas;
  final List<Shop> shops;
  final bool shoppingLoaded;
  final MetroNetwork metro;

  Place? place(String id) => places.where((p) => p.id == id).firstOrNull;

  List<String> get neighbourhoods {
    final s = {for (final p in places) p.neighbourhood ?? 'Pune'}.toList()..sort();
    return s;
  }

  List<Outdoor> get runs => outdoors.where((o) => o.isRun).toList();
  List<Outdoor> get treks => outdoors.where((o) => !o.isRun).toList()
    ..sort((a, b) => (a.distanceFromPuneKm ?? 9999).compareTo(b.distanceFromPuneKm ?? 9999));

  static Future<Library> load(AssetBundle bundle) async {
    Future<Object?> json(String name) async => jsonDecode(await bundle.loadString('assets/data/$name'));
    Future<Object?> optional(String name) async {
      try {
        return await json(name);
      } catch (_) {
        return null; // Not supplied yet: the screen shows an honest empty state.
      }
    }

    final audit = (await json('publication-audit.json'))! as Map<String, dynamic>;
    final rows = <String, List<Map<String, dynamic>>>{};
    for (final name in ['places', 'outdoors', 'events', 'meetups']) {
      rows[name] = publishAudited(((await json('$name.json'))! as List).cast<Map<String, dynamic>>(), audit);
    }
    final metro = MetroNetwork.fromJson(
      (await json('metro.json'))! as Map<String, dynamic>,
      (await json('areas.json'))! as Map<String, dynamic>,
    );
    final historyRaw = await optional('history.json');
    final shoppingRaw = await optional('shopping.json');
    final shopping = parseShopping(shoppingRaw);
    return Library(
      auditCheckedAt: DateTime.parse(audit['checked_at'] as String),
      places: rows['places']!.map(Place.new).toList(),
      outdoors: rows['outdoors']!.map(Outdoor.new).toList(),
      events: rows['events']!.map(EventListing.new).toList(),
      meetups: rows['meetups']!.map(Meetup.new).toList(),
      history: parseHistory(historyRaw),
      historyLoaded: historyRaw != null,
      shoppingAreas: shopping.$1,
      shops: shopping.$2,
      shoppingLoaded: shoppingRaw != null,
      metro: metro,
    );
  }
}

/// public/lib/publication.js: only rows the audit marks "publish" appear, with the
/// audit's overrides applied and the audit date as checked_at. Unknown ids stay hidden.
List<Map<String, dynamic>> publishAudited(List<Map<String, dynamic>> rows, Map<String, dynamic> audit) {
  final records = audit['records'] as Map;
  return [
    for (final row in rows)
      if ((records[row['id']] as Map?)?['decision'] == 'publish')
        {
          ...row,
          ...((records[row['id']] as Map)['overrides'] as Map? ?? const {}).cast<String, dynamic>(),
          'checked_at': audit['checked_at'],
        }
  ];
}

/// Entries without a source never ship.
List<HistoryEntry> parseHistory(Object? raw) {
  if (raw is! List) return const [];
  final out = <HistoryEntry>[];
  for (final r in raw.whereType<Map<String, dynamic>>()) {
    try {
      final e = HistoryEntry(r);
      if (e.sources.isNotEmpty && e.titleEn.isNotEmpty) out.add(e);
    } catch (_) {
      // A malformed row is skipped rather than shown half-built.
    }
  }
  out.sort((a, b) => (a.year ?? 99999).compareTo(b.year ?? 99999));
  return out;
}

(List<ShoppingArea>, List<Shop>) parseShopping(Object? raw) {
  if (raw is! Map<String, dynamic>) return (const [], const []);
  final shops = <Shop>[];
  for (final r in (raw['shops'] as List? ?? const []).whereType<Map<String, dynamic>>()) {
    try {
      final s = Shop(r);
      if (s.sources.isNotEmpty && s.name.isNotEmpty) shops.add(s);
    } catch (_) {}
  }
  final newest = shops.isEmpty ? null : shops.map((s) => s.checkedAt).reduce((a, b) => a.isAfter(b) ? a : b);
  final areas = <ShoppingArea>[];
  for (final r in (raw['areas'] as List? ?? const []).whereType<Map<String, dynamic>>()) {
    try {
      final checked = r['checked_at'] is String ? DateTime.tryParse(r['checked_at'] as String) : null;
      final a = ShoppingArea(r, checkedAt: checked ?? newest);
      if (a.sources.isNotEmpty && a.name.isNotEmpty) areas.add(a);
    } catch (_) {}
  }
  return (areas, shops);
}
