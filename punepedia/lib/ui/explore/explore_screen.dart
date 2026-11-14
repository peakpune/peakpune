import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../data/queries.dart';
import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../widgets/common.dart';

IconData categoryIcon(String id) => switch (id) {
      'event' => Icons.event_note_outlined,
      'place' => Icons.account_balance_outlined,
      'neighbourhood' => Icons.holiday_village_outlined,
      'person' => Icons.person_outline,
      'food' => Icons.restaurant_outlined,
      'festival' => Icons.celebration_outlined,
      'term' => Icons.translate,
      'institution' => Icons.school_outlined,
      _ => Icons.folder_outlined,
    };

EntryFilter defaultFilter(AppState state) => EntryFilter(
      statuses: {
        EntryStatus.verified,
        EntryStatus.disputed,
        if (state.showResearchLeads) EntryStatus.researchLead,
      },
    );

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(s.t('navExplore')), actions: commonActions(context)),
      body: ListView(
        padding: const EdgeInsets.only(top: 8, bottom: 32),
        children: [
          if (AppScope.of(context).library.hasFixtures) const FixtureBanner(),
          const CategoryGrid(shrinkWrap: true),
        ],
      ),
    );
  }
}

/// Topic tiles. Shows the count of entries that pass the current filter,
/// including zero — empty topics are shown honestly, not hidden.
class CategoryGrid extends StatelessWidget {
  const CategoryGrid({super.key, this.shrinkWrap = false});
  final bool shrinkWrap;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final filter = defaultFilter(state);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final s = S.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final scale = MediaQuery.textScalerOf(context).scale(1);
    final columns = width > 700 ? 3 : (scale > 1.3 ? 1 : 2);
    return GridView.builder(
      shrinkWrap: shrinkWrap,
      physics: shrinkWrap ? const NeverScrollableScrollPhysics() : null,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: columns,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        // Most of the tile is text, so its height follows the text scale;
        // a two-line label must still fit at large sizes.
        mainAxisExtent: 72 + 52 * scale,
      ),
      itemCount: lib.categories.length,
      itemBuilder: (context, i) {
        final cat = lib.categories[i];
        final n = entriesInCategory(lib, cat.id, filter).length;
        final label = cat.label;
        return Panel(
          padding: const EdgeInsets.all(14),
          semanticLabel: '$label, ${s.t('entriesCount', {'n': n})}',
          onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CategoryScreen(categoryId: cat.id))),
          child: ExcludeSemantics(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(categoryIcon(cat.id), color: n == 0 ? c.inkMuted : c.saffron),
                const Spacer(),
                Text(label, style: tt.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
                Text(s.t('entriesCount', {'n': n}), style: tt.labelSmall),
              ],
            ),
          ),
        );
      },
    );
  }
}

class CategoryScreen extends StatelessWidget {
  const CategoryScreen({super.key, required this.categoryId});
  final String categoryId;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final cat = lib.category(categoryId);
    final s = S.of(context);
    final list = entriesInCategory(lib, categoryId, defaultFilter(state));
    return Scaffold(
      appBar: AppBar(title: Text(cat?.label ?? ''), actions: commonActions(context)),
      body: list.isEmpty
          ? ListView(children: [EmptyState(icon: categoryIcon(categoryId), message: s.t('topicEmpty'))])
          : ListView.separated(
              padding: const EdgeInsets.only(bottom: 32),
              itemCount: list.length,
              separatorBuilder: (_, __) => const Divider(indent: 20, endIndent: 20),
              itemBuilder: (_, i) => EntryTile(entry: list[i]),
            ),
    );
  }
}

class CollectionScreen extends StatelessWidget {
  const CollectionScreen({super.key, required this.collection});
  final Collection collection;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final tt = Theme.of(context).textTheme;
    final entries = [
      for (final id in collection.entryIds)
        if (lib.entry(id) != null && (lib.entry(id)!.isPublic || state.showResearchLeads)) lib.entry(id)!,
    ];
    return Scaffold(
      appBar: AppBar(actions: commonActions(context)),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 32),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Semantics(header: true, child: Text(collection.title, style: tt.headlineMedium)),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
            child: Text(collection.blurb, style: tt.bodyLarge),
          ),
          const Divider(),
          for (final e in entries) ...[EntryTile(entry: e), const Divider(indent: 20, endIndent: 20)],
        ],
      ),
    );
  }
}
