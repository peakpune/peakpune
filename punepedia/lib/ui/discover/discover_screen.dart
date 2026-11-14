import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../data/queries.dart';
import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../explore/explore_screen.dart';
import '../search/search_screen.dart';
import '../sources/source_sheet.dart';
import '../widgets/common.dart';

class DiscoverScreen extends StatelessWidget {
  const DiscoverScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final featured = featuredEntry(lib);
    final reviewed = lib.entries.where((e) => e.review.state == ReviewState.reviewed).length;
    final realEntries = lib.entries.where((e) => !e.isFixture).length;

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating: true,
              title: const _Wordmark(),
              actions: commonActions(context),
            ),
            SliverList.list(children: [
              if (lib.hasFixtures) const FixtureBanner(),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                child: Text(s.t('tagline'), style: tt.bodyMedium?.copyWith(color: c.inkMuted)),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Semantics(
                  button: true,
                  label: s.t('search'),
                  hint: s.t('searchHint'),
                  excludeSemantics: true,
                  child: Material(
                    color: c.paperRaised,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: c.rule)),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SearchScreen())),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                        child: Row(children: [
                          Icon(Icons.search, color: c.inkMuted),
                          const SizedBox(width: 12),
                          Expanded(child: Text(s.t('searchHint'), style: tt.bodyLarge?.copyWith(color: c.inkMuted))),
                        ]),
                      ),
                    ),
                  ),
                ),
              ),
              if (featured != null) ...[
                SectionHeader(s.t('featured')),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: _FeaturedCard(entry: featured),
                ),
              ],
              SectionHeader(s.t('collections')),
              SizedBox(
                height: 120 + 48 * MediaQuery.textScalerOf(context).scale(1),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: lib.collections.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 12),
                  itemBuilder: (context, i) => _CollectionCard(collection: lib.collections[i]),
                ),
              ),
              SectionHeader(s.t('browseTopics')),
              const CategoryGrid(shrinkWrap: true),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Panel(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(s.t('libraryStatus', {'n': realEntries, 'r': reviewed, 's': lib.sources.length}), style: tt.titleSmall),
                      const SizedBox(height: 6),
                      Text(s.t(reviewed < realEntries ? 'draftBanner' : 'libraryNote'), style: tt.bodySmall),
                      if (!state.unlock.unlocked) ...[
                        const SizedBox(height: 6),
                        Text(
                          s.t('freeSamples', {'f': lib.entries.where((e) => e.freeSample).length, 'n': realEntries}),
                          style: tt.bodySmall?.copyWith(color: c.saffron),
                        ),
                      ],
                      const SizedBox(height: 8),
                      TextButton.icon(
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(48, 48)),
                        icon: const Icon(Icons.library_books_outlined),
                        label: Text(s.t('sourceRegisterOpen')),
                        onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SourcesScreen())),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
            ]),
          ],
        ),
      ),
    );
  }
}

class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    final c = PPColors.of(context);
    final s = S.of(context);
    return Semantics(
      header: true,
      label: s.t('appName'),
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 3, height: 22, color: c.saffron),
          const SizedBox(width: 10),
          // Scales down rather than overflowing beside the app-bar actions at
          // large text sizes.
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: AlignmentDirectional.centerStart,
              child: Text(s.t('appName'), style: Theme.of(context).textTheme.headlineSmall),
            ),
          ),
        ],
      ),
    );
  }
}

class _FeaturedCard extends StatelessWidget {
  const _FeaturedCard({required this.entry});
  final Entry entry;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final s = S.of(context);
    final date = entry.date?.label;
    return Panel(
      onTap: () => openEntry(context, entry.id),
      semanticLabel: '${s.t('featured')}: ${entry.title}',
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(height: 4, color: c.saffron),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(children: [
                  if (date != null) Expanded(child: Text(date, style: tt.labelLarge?.copyWith(color: c.saffron))) else const Spacer(),
                  StatusBadge(entry.status, dense: true),
                ]),
                const SizedBox(height: 10),
                Text(entry.title, style: tt.headlineSmall),
                const SizedBox(height: 8),
                Text(entry.summary, style: tt.bodyLarge?.copyWith(color: c.inkMuted)),
                const SizedBox(height: 14),
                Row(children: [
                  Flexible(child: Text(s.t('readStory'), style: tt.labelLarge?.copyWith(color: c.saffron))),
                  const SizedBox(width: 6),
                  Icon(Icons.arrow_forward, size: 18, color: c.saffron),
                ]),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CollectionCard extends StatelessWidget {
  const _CollectionCard({required this.collection});
  final Collection collection;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final s = S.of(context);
    final count = collection.entryIds.where((id) => state.library.entry(id) != null).length;
    return SizedBox(
      width: 250,
      child: Panel(
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CollectionScreen(collection: collection))),
        semanticLabel: collection.title,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(collection.title, style: tt.titleLarge?.copyWith(fontSize: 19), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Expanded(child: Text(collection.blurb, style: tt.bodySmall, maxLines: 3, overflow: TextOverflow.ellipsis)),
            Text(s.t('entriesCount', {'n': count}), style: tt.labelMedium?.copyWith(color: c.saffron)),
          ],
        ),
      ),
    );
  }
}
