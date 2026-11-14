import 'package:flutter/material.dart';

import '../data/honesty.dart';
import '../data/models.dart';
import '../shared/actions.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';

const typeLabel = {
  'museum': 'Museum', 'heritage': 'Heritage site', 'temple': 'Temple', 'bookstore': 'Bookstore', 'gallery': 'Art gallery',
  'cultural-centre': 'Cultural centre', 'archive': 'Archive', 'cafe': 'Cafe', 'restaurant': 'Restaurant', 'bar': 'Bar and brewpub',
  'sweets': 'Sweet shop', 'park': 'Park', 'zoo': 'Zoo', 'bakery': 'Bakery', 'garden': 'Garden', 'market': 'Market',
};

String tagLabel(String tag) => tag.replaceAll('-', ' ');

/// Places by neighbourhood, with search and tag filters.
class ExploreScreen extends StatefulWidget {
  const ExploreScreen({super.key});

  @override
  State<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends State<ExploreScreen> {
  final _search = TextEditingController();
  String? _area;
  final Set<String> _tags = {};

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  bool _matches(Place p) {
    final q = _search.text.trim().toLowerCase();
    if (_area != null && (p.neighbourhood ?? 'Pune') != _area) return false;
    if (_tags.isNotEmpty && !_tags.every(p.tags.contains)) return false;
    if (q.isEmpty) return true;
    return [p.name, p.summary, p.neighbourhood ?? '', typeLabel[p.type] ?? p.type, ...p.tags].join(' ').toLowerCase().contains(q);
  }

  @override
  Widget build(BuildContext context) {
    final lib = AppScope.of(context).library;
    final tagCounts = <String, int>{};
    for (final p in lib.places) {
      for (final t in p.tags) {
        tagCounts[t] = (tagCounts[t] ?? 0) + 1;
      }
    }
    final popularTags = (tagCounts.entries.toList()..sort((a, b) => b.value.compareTo(a.value))).take(12).map((e) => e.key).toList();
    final shown = lib.places.where(_matches).toList();
    final byArea = <String, List<Place>>{};
    for (final p in shown) {
      (byArea[p.neighbourhood ?? 'Pune'] ??= []).add(p);
    }
    final areas = byArea.keys.toList()..sort();
    final filtering = _search.text.isNotEmpty || _area != null || _tags.isNotEmpty;

    return CustomScrollView(
      key: const PageStorageKey('explore'),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(PP.s4, PP.s6, PP.s4, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Eyebrow('Explore Pune'),
              const SizedBox(height: PP.s2),
              Semantics(header: true, child: Text('Places, checked at the source.', style: Theme.of(context).textTheme.headlineMedium)),
              const SizedBox(height: PP.s2),
              Text('${lib.places.length} places. Addresses, timings and prices come from each venue\'s own page, with the date we checked.', style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: PP.s5),
              TextField(
                controller: _search,
                onChanged: (_) => setState(() {}),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Search places, areas, tags',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _search.text.isEmpty
                      ? null
                      : IconButton(tooltip: 'Clear search', icon: const Icon(Icons.close), onPressed: () => setState(_search.clear)),
                ),
              ),
            ]),
          ),
        ),
        SliverToBoxAdapter(child: _ChipRow(label: 'Area', options: lib.neighbourhoods, selected: {?_area}, onTap: (a) => setState(() => _area = _area == a ? null : a))),
        SliverToBoxAdapter(child: _ChipRow(label: 'Tags', options: popularTags, selected: _tags, display: tagLabel, onTap: (t) => setState(() => _tags.contains(t) ? _tags.remove(t) : _tags.add(t)))),
        if (filtering)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(PP.s4, PP.s2, PP.s4, 0),
              child: Row(children: [
                Expanded(child: Semantics(liveRegion: true, child: Text('${shown.length} of ${lib.places.length} places', style: inter(14, 600)))),
                TextButton(onPressed: () => setState(() {
                      _search.clear();
                      _area = null;
                      _tags.clear();
                    }), child: const Text('Clear filters')),
              ]),
            ),
          ),
        if (shown.isEmpty)
          SliverToBoxAdapter(
            child: EmptyState(
              icon: Icons.search_off,
              title: 'Nothing matches that.',
              message: 'Even Pune has limits. Try fewer filters, or a different spelling of that peth.',
              actions: [DetailAction('Clear filters', Icons.close, () => setState(() {
                    _search.clear();
                    _area = null;
                    _tags.clear();
                  }), primary: true)],
            ),
          ),
        for (final area in areas) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(PP.s4, PP.s8, PP.s4, PP.s3),
              child: Semantics(header: true, child: Text('$area · ${byArea[area]!.length}', style: Theme.of(context).textTheme.headlineSmall)),
            ),
          ),
          SliverList.separated(
            itemCount: byArea[area]!.length,
            separatorBuilder: (_, _) => const SizedBox(height: PP.s4),
            itemBuilder: (context, i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: PP.s4),
              child: PlaceCard(place: byArea[area]![i]),
            ),
          ),
        ],
        const SliverToBoxAdapter(child: SizedBox(height: PP.s12)),
      ],
    );
  }
}

class _ChipRow extends StatelessWidget {
  const _ChipRow({required this.label, required this.options, required this.selected, required this.onTap, this.display});
  final String label;
  final List<String> options;
  final Set<String> selected;
  final ValueChanged<String> onTap;
  final String Function(String)? display;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: PP.s4),
        child: SizedBox(
          height: 52,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: PP.s4),
            itemCount: options.length,
            separatorBuilder: (_, _) => const SizedBox(width: PP.s2),
            itemBuilder: (context, i) {
              final o = options[i];
              final on = selected.contains(o);
              return Semantics(
                label: '$label filter: ${display?.call(o) ?? o}',
                selected: on,
                excludeSemantics: true,
                child: FilterChip(
                  label: Text(display?.call(o) ?? o, style: inter(14, 600, color: on ? PP.white : PP.ink)),
                  selected: on,
                  onSelected: (_) => onTap(o),
                  materialTapTargetSize: MaterialTapTargetSize.padded,
                ),
              );
            },
          ),
        ),
      );
}

class PlaceCard extends StatelessWidget {
  const PlaceCard({super.key, required this.place});
  final Place place;

  @override
  Widget build(BuildContext context) => EntryCard(
        eyebrow: '${typeLabel[place.type] ?? place.type} · ${place.neighbourhood ?? 'Pune'}',
        title: place.name,
        summary: place.summary,
        footer: place.hours,
        onTap: () => openPage(context, PlaceDetail(place: place)),
      );
}

class PlaceDetail extends StatelessWidget {
  const PlaceDetail({super.key, required this.place});
  final Place place;

  @override
  Widget build(BuildContext context) {
    final p = place;
    final map = mapUrl(name: p.name, lat: p.lat, lon: p.lon, address: p.address);
    return DetailPage(
      eyebrow: typeLabel[p.type] ?? 'Place',
      title: p.name,
      summary: p.summary,
      sources: p.sources,
      checkedAt: p.checkedAt,
      shareUrl: p.webUrl,
      shareLine: [p.neighbourhood, p.summary].whereType<String>().join(' · '),
      badges: [
        TagPill(p.neighbourhood ?? 'Pune', color: PP.clay),
        if (p.status == Verification.partial) const LevelBadge('Some details missing', fill: PP.paper),
      ],
      flags: [
        if (p.sourceStale) 'The source for this listing is more than 90 days old. Check with the venue before you go.',
      ],
      actions: [
        if (map != null) DetailAction('Map', Icons.map_outlined, () => openLink(context, map), primary: true),
        if (p.urlDeep ?? p.urlOfficial case final url?) DetailAction('Venue page', Icons.north_east, () => openLink(context, url)),
      ],
      facts: [
        Fact('Address', p.address ?? 'Not stated on the source page'),
        Fact('Timings', p.hours ?? 'Not confirmed'),
        Fact('Prices', priceText(p.priceNote)),
        if (p.goodFor.isNotEmpty) Fact('Good for', p.goodFor.join(', ')),
        if (p.notes != null) Fact('Note', p.notes!),
        if (p.urlOfficial != null) Fact('Official site', p.urlOfficial!, link: p.urlOfficial),
      ],
      tags: p.tags.map(tagLabel).toList(),
      osmCredit: p.hasCoordinates,
      provenance: '${p.status == Verification.verified ? 'Name, address and link are confirmed on the venue or organiser page.' : 'Some details are missing because the source page does not state them.'} Timings and prices change, so confirm with the venue.',
    );
  }
}
