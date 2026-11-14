import 'package:flutter/material.dart';

import '../data/models.dart';
import '../shared/actions.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';

/// Markets by area and standout old shops, each with sources.
class ShoppingScreen extends StatelessWidget {
  const ShoppingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    Widget empty() => EmptyState(
          icon: Icons.storefront_outlined,
          title: lib.shoppingLoaded ? 'Nothing verified here yet.' : 'The shopping guide is still being checked.',
          message: 'Markets and old shops appear only once each has a source. Tulshibaug will wait; it always has.',
          actions: [DetailAction('Explore places', Icons.place_outlined, () {
            state.goTab(1);
            Navigator.of(context).popUntil((r) => r.isFirst);
          }, primary: true)],
        );
    final byArea = <String, List<Shop>>{};
    for (final s in lib.shops) {
      (byArea[s.area ?? 'Pune'] ??= []).add(s);
    }
    return Scaffold(
      appBar: AppBar(title: const Text('Shopping and markets')),
      body: DefaultTabController(
        length: 2,
        child: Column(children: [
          const SizedBox(height: PP.s4),
          const PillTabs(tabs: ['Markets by area', 'Old shops']),
          Expanded(
            child: TabBarView(children: [
              lib.shoppingAreas.isEmpty
                  ? ListView(children: [empty()])
                  : ListView.separated(
                      key: const PageStorageKey('markets'),
                      padding: const EdgeInsets.fromLTRB(PP.s4, PP.s4, PP.s4, PP.s12),
                      itemCount: lib.shoppingAreas.length,
                      separatorBuilder: (_, _) => const SizedBox(height: PP.s4),
                      itemBuilder: (context, i) {
                        final a = lib.shoppingAreas[i];
                        return EntryCard(
                          eyebrow: a.area ?? 'Pune',
                          title: a.name,
                          summary: a.knownFor == null ? null : 'Known for ${a.knownFor}',
                          footer: a.bestFor == null ? null : 'Best for ${a.bestFor}',
                          onTap: () => openPage(context, AreaDetail(a: a)),
                        );
                      },
                    ),
              lib.shops.isEmpty
                  ? ListView(children: [empty()])
                  : ListView(
                      key: const PageStorageKey('shops'),
                      padding: const EdgeInsets.fromLTRB(PP.s4, 0, PP.s4, PP.s12),
                      children: [
                        for (final area in (byArea.keys.toList()..sort())) ...[
                          Padding(
                            padding: const EdgeInsets.only(top: PP.s6, bottom: PP.s3),
                            child: Semantics(header: true, child: Text(area, style: Theme.of(context).textTheme.headlineSmall)),
                          ),
                          for (final s in byArea[area]!)
                            Padding(
                              padding: const EdgeInsets.only(bottom: PP.s4),
                              child: EntryCard(
                                eyebrow: s.since == null ? area : 'Since ${s.since} · $area',
                                title: s.name,
                                summary: s.knownFor == null ? null : 'Known for ${s.knownFor}',
                                footer: s.note,
                                onTap: () => openPage(context, ShopDetail(s: s)),
                              ),
                            ),
                        ],
                      ],
                    ),
            ]),
          ),
        ]),
      ),
    );
  }
}

class AreaDetail extends StatelessWidget {
  const AreaDetail({super.key, required this.a});
  final ShoppingArea a;

  @override
  Widget build(BuildContext context) {
    final map = mapUrl(name: a.name, address: '${a.area ?? ''} Pune'.trim());
    return DetailPage(
      eyebrow: 'Market area',
      title: a.name,
      summary: a.knownFor == null ? 'A shopping area in ${a.area ?? 'Pune'}.' : 'Known for ${a.knownFor}.',
      sources: a.sources,
      checkedAt: a.checkedAt,
      shareUrl: PP.siteUrl,
      shareLine: a.knownFor == null ? a.area : 'Known for ${a.knownFor}',
      badges: [TagPill(a.area ?? 'Pune', color: PP.clay)],
      actions: [if (map != null) DetailAction('Map', Icons.map_outlined, () => openLink(context, map), primary: true)],
      facts: [
        if (a.area != null) Fact('Area', a.area!),
        Fact('Known for', a.knownFor ?? 'Not stated'),
        if (a.bestFor != null) Fact('Best for', a.bestFor!),
        if (a.notes != null) Fact('Note', a.notes!),
      ],
    );
  }
}

class ShopDetail extends StatelessWidget {
  const ShopDetail({super.key, required this.s});
  final Shop s;

  @override
  Widget build(BuildContext context) {
    final map = mapUrl(name: s.name, address: '${s.area ?? ''} Pune'.trim());
    return DetailPage(
      eyebrow: 'Shop',
      title: s.name,
      summary: s.knownFor == null ? 'A shop in ${s.area ?? 'Pune'}.' : 'Known for ${s.knownFor}.',
      sources: s.sources,
      checkedAt: s.checkedAt,
      shareUrl: PP.siteUrl,
      shareLine: [if (s.since != null) 'Since ${s.since}', ?s.area].join(' · '),
      badges: [
        if (s.since != null) TagPill('Since ${s.since}', color: PP.haldi),
        TagPill(s.area ?? 'Pune', color: PP.clay),
      ],
      actions: [if (map != null) DetailAction('Map', Icons.map_outlined, () => openLink(context, map), primary: true)],
      facts: [
        if (s.area != null) Fact('Area', s.area!),
        Fact('Known for', s.knownFor ?? 'Not stated'),
        // A founding year only where a source gives one; never estimated.
        Fact('Since', s.since?.toString() ?? 'Founding year not verified'),
        if (s.note != null) Fact('Note', s.note!),
      ],
    );
  }
}
