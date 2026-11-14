import 'models.dart';

/// Filters shared by search, timeline and explore.
class EntryFilter {
  const EntryFilter({
    this.categories = const {},
    this.eras = const {},
    this.statuses = const {EntryStatus.verified, EntryStatus.disputed},
    this.includeFixtures = true,
  });

  final Set<String> categories;
  final Set<String> eras;
  final Set<EntryStatus> statuses;
  final bool includeFixtures;

  bool get showsResearchLeads => statuses.contains(EntryStatus.researchLead);

  bool matches(Entry e) {
    if (e.isFixture) return includeFixtures;
    if (!statuses.contains(e.status)) return false;
    if (categories.isNotEmpty && !e.categories.any(categories.contains)) {
      return false;
    }
    if (eras.isNotEmpty && (e.era == null || !eras.contains(e.era))) {
      return false;
    }
    return true;
  }

  EntryFilter copyWith({
    Set<String>? categories,
    Set<String>? eras,
    Set<EntryStatus>? statuses,
  }) =>
      EntryFilter(
        categories: categories ?? this.categories,
        eras: eras ?? this.eras,
        statuses: statuses ?? this.statuses,
        includeFixtures: includeFixtures,
      );

  bool get isDefault =>
      categories.isEmpty &&
      eras.isEmpty &&
      statuses.length == 2 &&
      statuses.contains(EntryStatus.verified) &&
      statuses.contains(EntryStatus.disputed);
}

/// Timeline rows grouped by era, ordered by date. Undated entries sit at the
/// top of their era. Research leads appear only if the filter asks for them.
List<(Era, List<Entry>)> timelineByEra(Library lib, EntryFilter filter) {
  final out = <(Era, List<Entry>)>[];
  for (final era in lib.eras) {
    if (filter.eras.isNotEmpty && !filter.eras.contains(era.id)) continue;
    final rows = lib.entries
        .where((e) => e.onTimeline && e.era == era.id && filter.matches(e))
        .toList()
      ..sort((a, b) {
        final ak = a.date?.sortKey ?? -1;
        final bk = b.date?.sortKey ?? -1;
        return ak.compareTo(bk);
      });
    out.add((era, rows));
  }
  return out;
}

List<Entry> entriesInCategory(Library lib, String categoryId, EntryFilter filter) {
  final list = lib.entries
      .where((e) => e.categories.contains(categoryId) && filter.matches(e))
      .toList()
    ..sort((a, b) => (a.title).compareTo(b.title));
  return list;
}

Entry? featuredEntry(Library lib) =>
    lib.entries.where((e) => e.featured && e.isPublic).firstOrNull ??
    lib.entries.where((e) => e.isPublic).firstOrNull;
