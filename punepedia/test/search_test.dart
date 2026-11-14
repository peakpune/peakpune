import 'package:flutter_test/flutter_test.dart';
import 'package:punepedia/data/models.dart';
import 'package:punepedia/data/queries.dart';
import 'package:punepedia/data/search.dart';

import 'helpers.dart';

void main() {
  late SearchIndex index;
  setUpAll(() => index = SearchIndex(loadRealLibrary()));

  test('finds entries by title, case-insensitively', () {
    final hits = index.search('shaniwar', const EntryFilter());
    expect(hits.first.entry.title, contains('Shaniwar'));
  });

  test('multi-word queries require every word', () {
    final hits = index.search('poona pact', const EntryFilter());
    expect(hits.map((h) => h.entry.id), contains('ev-1932-poona-pact'));
    expect(index.search('poona zzzz', const EntryFilter()), isEmpty);
  });

  test('matches body text and source titles', () {
    expect(index.search('dakshina', const EntryFilter()), isNotEmpty);
    expect(index.search('gazetteer', const EntryFilter()), isNotEmpty);
  });

  test('ignores diacritics', () {
    expect(SearchIndex.normalize('  Pāṭaleśvar  Cave '), 'patalesvar cave');
  });

  test('filters by category and hides research leads by default', () {
    final places = index.search('wada', const EntryFilter(categories: {'place'}));
    expect(places.every((h) => h.entry.categories.contains('place')), isTrue);
    final leads = index.search('research lead', const EntryFilter());
    expect(leads.where((h) => h.entry.status == EntryStatus.researchLead), isEmpty);
  });

  test('empty query returns nothing', () {
    expect(index.search('   ', const EntryFilter()), isEmpty);
  });
}
