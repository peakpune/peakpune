import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:punepedia/data/models.dart';
import 'package:punepedia/data/queries.dart';

import 'helpers.dart';

void main() {
  late Library lib;
  setUpAll(() => lib = loadRealLibrary());

  test('library has entries, eras and sources', () {
    expect(lib.entries, isNotEmpty);
    expect(lib.eras.map((e) => e.id), containsAll(['early', 'swarajya', 'peshwa', 'colonial', 'modern']));
    expect(lib.sources, isNotEmpty);
  });

  test('ids are unique and related ids resolve', () {
    final ids = lib.entries.map((e) => e.id).toList();
    expect(ids.toSet().length, ids.length);
    for (final e in lib.entries) {
      for (final r in e.related) {
        expect(lib.entry(r), isNotNull, reason: '${e.id} -> $r');
      }
    }
  });

  test('no development fixtures in the release library', () {
    expect(lib.entries.where((e) => e.isFixture || e.id.startsWith('fx-')), isEmpty);
    final fx = jsonDecode(File('assets/content/dev_fixtures.json').readAsStringSync()) as Map<String, dynamic>;
    expect(fx['fixtures'], isEmpty, reason: 'run `python3 tools/content.py build` without --fixtures before release');
  });

  test('every citation points to a registered source with a link', () {
    for (final e in lib.entries) {
      for (final c in e.allCites) {
        final s = lib.source(c.sourceId);
        expect(s, isNotNull, reason: '${e.id} cites ${c.sourceId}');
        expect(s!.url, startsWith('https://'));
        expect(s.title, isNotEmpty);
      }
    }
  });

  test('every public entry cites at least one source a PunePedia editor read', () {
    for (final e in lib.entries.where((e) => e.isPublic)) {
      final consulted = e.allCites.any((c) => lib.source(c.sourceId)?.consulted ?? false);
      expect(consulted, isTrue, reason: e.id);
    }
  });

  test('evidence, tradition and disputed segments always carry citations', () {
    for (final e in lib.entries) {
      for (final s in e.body) {
        if (s.kind != SegmentKind.note) {
          expect(s.cites, isNotEmpty, reason: '${e.id}: ${s.text}');
        }
      }
    }
  });

  test('map locations name a source and sit in the Pune region', () {
    for (final e in lib.entries.where((e) => e.location != null)) {
      final l = e.location!;
      expect(lib.source(l.sourceId), isNotNull, reason: e.id);
      expect(l.lat, inInclusiveRange(17.8, 19.4), reason: e.id);
      expect(l.lng, inInclusiveRange(73.2, 75.2), reason: e.id);
    }
  });

  test('every entry has a title, summary and story in English', () {
    for (final e in lib.entries) {
      expect(e.title, isNotEmpty, reason: e.id);
      expect(e.summary, isNotEmpty, reason: e.id);
      expect(e.body, isNotEmpty, reason: e.id);
    }
  });

  test('the library contains no Devanagari text', () {
    final devanagari = RegExp('[\u0900-\u097F]');
    for (final e in lib.entries) {
      final text = [e.title, e.summary, ...e.body.map((s) => s.text)].join(' ');
      expect(devanagari.hasMatch(text), isFalse, reason: e.id);
    }
    for (final label in [...lib.eras.map((e) => e.label), ...lib.categories.map((c) => c.label)]) {
      expect(devanagari.hasMatch(label), isFalse, reason: label);
    }
  });

  test('every public entry is signed off and every map location verified', () {
    for (final e in lib.entries.where((e) => e.isPublic)) {
      expect(e.review.state, ReviewState.reviewed, reason: e.id);
      if (e.location != null) {
        expect(e.location!.status, LocationStatus.verified, reason: e.id);
      }
    }
  });

  test('research leads are kept out of the default timeline', () {
    const filter = EntryFilter();
    final rows = timelineByEra(lib, filter).expand((g) => g.$2).toList();
    expect(rows, isNotEmpty);
    expect(rows.where((e) => e.status == EntryStatus.researchLead), isEmpty);

    final withLeads = timelineByEra(
      lib,
      filter.copyWith(statuses: {...EntryStatus.values}),
    ).expand((g) => g.$2);
    expect(withLeads.where((e) => e.status == EntryStatus.researchLead), isNotEmpty);
  });

  test('timeline is in date order within each era', () {
    for (final (_, rows) in timelineByEra(lib, const EntryFilter())) {
      final keys = rows.map((e) => e.date?.sortKey ?? -1).toList();
      final sorted = [...keys]..sort();
      expect(keys, sorted);
    }
  });

  test('no placeholder text in real entries', () {
    final blob = jsonEncode(jsonDecode(File('assets/content/library.json').readAsStringSync())['entries']);
    expect(RegExp(r'lorem ipsum|\bTODO\b|PLACEHOLDER|DEV FIXTURE', caseSensitive: false).hasMatch(blob), isFalse);
  });
}
