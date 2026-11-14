import 'package:flutter/material.dart';

import '../data/models.dart';
import '../shared/actions.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';

String _km(double v) => v == v.roundToDouble() ? '${v.toInt()} km' : '${v.toStringAsFixed(1)} km';

String _sourceName(Outdoor o) {
  final host = Uri.tryParse(o.urlDeep ?? o.urlOfficial ?? '')?.host ?? '';
  if (host.contains('punerunners')) return 'PuneRunners Club';
  if (host.contains('punetrekkers')) return 'Pune Trekkers';
  return 'the source';
}

/// Running loops and treks, with distance and difficulty.
class OutdoorsScreen extends StatelessWidget {
  const OutdoorsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lib = AppScope.of(context).library;
    return DefaultTabController(
      length: 2,
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(PP.s4, PP.s6, PP.s4, PP.s3),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Eyebrow('Outdoors'),
            const SizedBox(height: PP.s2),
            Semantics(header: true, child: Text('Loops and treks', style: Theme.of(context).textTheme.headlineMedium)),
          ]),
        ),
        const PillTabs(tabs: ['Running loops', 'Treks and day trips']),
        Expanded(
          child: TabBarView(children: [
            _OutdoorList(
              key: const PageStorageKey('runs'),
              rows: lib.runs,
              intro: 'Plotted by PuneRunners Club on OpenStreetMap data. Mapped, not run-tested: footpaths, traffic and lighting are unchecked.',
            ),
            _OutdoorList(
              key: const PageStorageKey('treks'),
              rows: lib.treks,
              intro: 'Sorted by drive from Pune. Distances, timings and difficulty are as the guides state them. Go early, go in company.',
            ),
          ]),
        ),
      ]),
    );
  }
}

class _OutdoorList extends StatelessWidget {
  const _OutdoorList({super.key, required this.rows, required this.intro});
  final List<Outdoor> rows;
  final String intro;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return const EmptyState(title: 'No routes yet.', message: 'The hills are still there. The listings will be back after the next check.');
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(PP.s4, PP.s4, PP.s4, PP.s12),
      itemCount: rows.length + 1,
      separatorBuilder: (_, _) => const SizedBox(height: PP.s4),
      itemBuilder: (context, i) => i == 0 ? Text(intro, style: Theme.of(context).textTheme.bodySmall) : OutdoorCard(o: rows[i - 1]),
    );
  }
}

List<Widget> outdoorMeta(Outdoor o) => [
      if (o.difficulty != null) LevelBadge(o.difficulty!, fill: LevelBadge.fillFor(o.difficulty)),
      if (o.distanceKm != null) MetaText('${_km(o.distanceKm!)} route'),
      if (o.distanceFromPuneKm != null) MetaText('${_km(o.distanceFromPuneKm!)} from Pune'),
      if (o.travelTimeText != null) MetaText(o.travelTimeText!),
    ];

class OutdoorCard extends StatelessWidget {
  const OutdoorCard({super.key, required this.o});
  final Outdoor o;

  @override
  Widget build(BuildContext context) => EntryCard(
        eyebrow: o.neighbourhood ?? 'Pune',
        title: o.name,
        summary: o.summary,
        meta: outdoorMeta(o),
        onTap: () => openPage(context, OutdoorDetail(o: o)),
      );
}

class OutdoorDetail extends StatelessWidget {
  const OutdoorDetail({super.key, required this.o});
  final Outdoor o;

  @override
  Widget build(BuildContext context) {
    final map = mapUrl(name: o.name, lat: o.lat, lon: o.lon, address: o.startPoint ?? (o.isTrek ? null : o.address));
    final who = _sourceName(o);
    return DetailPage(
      eyebrow: o.isTrek ? 'Trek' : o.isRun ? 'Running loop' : 'Day trip',
      title: o.name,
      summary: o.summary,
      sources: o.sources,
      checkedAt: o.checkedAt,
      shareUrl: o.webUrl,
      shareLine: [
        if (o.distanceKm != null) _km(o.distanceKm!),
        if (o.difficulty != null) o.difficulty!,
        if (o.distanceFromPuneKm != null) '${_km(o.distanceFromPuneKm!)} from Pune',
      ].join(' · '),
      badges: outdoorMeta(o).whereType<LevelBadge>().toList(),
      flags: [
        if (o.litAtNight == 'no') 'Unlit paths. Daylight only.',
        if (o.isRun) 'Mapped, not run-tested: footpaths, traffic and lighting are unchecked.',
        if (o.sourceStale) 'The source for this listing is more than 90 days old. Check before you go.',
      ],
      actions: [
        if (map != null) DetailAction('Map', Icons.map_outlined, () => openLink(context, map), primary: true),
        if (o.urlDeep ?? o.urlOfficial case final url?) DetailAction('Guide page', Icons.north_east, () => openLink(context, url)),
      ],
      facts: [
        Fact('Area', o.neighbourhood ?? 'Pune'),
        if (o.distanceKm != null) Fact('Route length', _km(o.distanceKm!)),
        Fact('Difficulty', o.difficulty ?? 'Not stated by the source'),
        if (o.distanceFromPuneKm != null) Fact('From Pune', _km(o.distanceFromPuneKm!)),
        if (o.travelTimeText != null) Fact('Drive', o.travelTimeText!),
        if (o.trekTimeText != null) Fact('Trek time', o.trekTimeText!),
        if (o.startPoint != null) Fact('Start point', o.startPoint!),
        if (o.isTrek) Fact('Best months', o.bestMonths ?? 'Not stated'),
        Fact('Lit at night', o.litAtNight == 'no' ? 'No. Unlit paths, daylight only' : 'Not checked by the source'),
        const Fact('Fees and permits', 'Not collected. Check with the guide or forest office.'),
        if (o.notes != null) Fact('Note', o.notes!),
      ],
      tags: o.tags.map((t) => t.replaceAll('-', ' ')).toList(),
      osmCredit: o.hasCoordinates,
      provenance: '${o.isTrek ? 'Distances, timings and difficulty are' : 'The route and its distance are'} as published by $who. Conditions change, and nobody at Peak Pune has walked or run this for you. Go early, go in company, and check with the source first.',
    );
  }
}

