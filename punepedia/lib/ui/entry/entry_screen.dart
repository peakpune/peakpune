import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../l10n/strings.dart';
import '../../state/app_state.dart';
import '../../theme/theme.dart';
import '../sources/source_sheet.dart';
import '../unlock/unlock_panel.dart';
import '../widgets/common.dart';

class EntryScreen extends StatelessWidget {
  const EntryScreen({super.key, required this.entryId});
  final String entryId;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final entry = lib.entry(entryId);
    final s = S.of(context);
    if (entry == null) {
      return Scaffold(appBar: AppBar(), body: EmptyState(icon: Icons.search_off, message: s.t('loadError')));
    }
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final body = entry.body;
    final era = lib.era(entry.era);
    final date = entry.date?.label;
    final saved = state.isBookmarked(entry.id);

    // Number sources in order of first citation, as in a printed footnote list.
    final order = <String>[];
    final pagesBySource = <String, Set<String>>{};
    for (final seg in body) {
      for (final cite in seg.cites) {
        if (!order.contains(cite.sourceId)) order.add(cite.sourceId);
        if (cite.pages != null) (pagesBySource[cite.sourceId] ??= {}).add(cite.pages!);
      }
    }
    if (entry.location != null && !order.contains(entry.location!.sourceId)) {
      order.add(entry.location!.sourceId);
    }

    return Scaffold(
      appBar: AppBar(
        actions: [
          IconButton(
            tooltip: saved ? s.t('bookmarkRemove') : s.t('bookmarkAdd'),
            isSelected: saved,
            icon: Icon(saved ? Icons.bookmark : Icons.bookmark_border, color: saved ? c.saffron : null),
            onPressed: () => state.toggleBookmark(entry.id),
          ),
          ...commonActions(context),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 48),
        children: [
          if (entry.isFixture) const FixtureBanner(),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (era != null || date != null)
                  Text(
                    [if (era != null) era.label, if (date != null) date].join('  ·  '),
                    style: tt.labelLarge?.copyWith(color: c.saffron),
                  ),
                const SizedBox(height: 10),
                Semantics(
                  header: true,
                  child: Text(entry.title, style: tt.headlineMedium),
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    StatusBadge(entry.status),
                    Text(
                      switch (entry.status) {
                        EntryStatus.verified => s.t('statusVerifiedHelp'),
                        EntryStatus.disputed => s.t('statusDisputedHelp'),
                        EntryStatus.researchLead => s.t('statusResearchLeadHelp'),
                      },
                      style: tt.bodySmall,
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Text(entry.summary, style: tt.bodyLarge?.copyWith(fontSize: 19, height: 1.55)),
                const SizedBox(height: 18),
                _ReviewPanel(entry: entry),
              ],
            ),
          ),
          if (!state.canRead(entry))
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 24, 20, 0),
              child: UnlockPanel(),
            )
          else ...[
            SectionHeader(s.t('story')),
            for (final seg in body)
              _SegmentView(segment: seg, numbers: {for (var i = 0; i < order.length; i++) order[i]: i + 1}),
            _MediaSection(entry: entry),
            if (entry.isPlace || entry.location != null) _LocationSection(entry: entry, sourceNumber: entry.location == null ? null : order.indexOf(entry.location!.sourceId) + 1),
            SectionHeader(s.t('sources')),
            if (order.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text('—', style: tt.bodyMedium),
              ),
            for (var i = 0; i < order.length; i++)
              _SourceLine(number: i + 1, sourceId: order[i], pages: pagesBySource[order[i]]?.join('; ')),
          ],
          if (entry.related.isNotEmpty) ...[
            SectionHeader(s.t('related')),
            for (final id in entry.related)
              if (lib.entry(id) != null) EntryTile(entry: lib.entry(id)!, showSummary: false),
          ],
        ],
      ),
    );
  }
}

class _ReviewPanel extends StatelessWidget {
  const _ReviewPanel({required this.entry});
  final Entry entry;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final r = entry.review;
    final reviewed = r.state == ReviewState.reviewed;
    final headline = switch (r.state) {
      ReviewState.reviewed => s.t('reviewDone', {'date': r.lastReviewed ?? '', 'name': r.reviewer ?? ''}),
      ReviewState.fixture => s.t('reviewFixture'),
      ReviewState.draft => s.t('reviewDraft'),
    };
    return Container(
      decoration: BoxDecoration(
        border: Border(left: BorderSide(color: reviewed ? c.verified : c.disputed, width: 3)),
      ),
      padding: const EdgeInsets.fromLTRB(12, 2, 0, 2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(reviewed ? Icons.verified_outlined : Icons.pending_outlined, size: 17, color: reviewed ? c.verified : c.disputed),
            const SizedBox(width: 6),
            Expanded(child: Text(headline, style: tt.titleSmall)),
          ]),
          if (r.draftedOn != null)
            Text(s.t('reviewDrafted', {'date': r.draftedOn!}), style: tt.bodySmall),
          if (r.state == ReviewState.draft) ...[
            const SizedBox(height: 4),
            Text(s.t('reviewAiNote'), style: tt.bodySmall),
          ],
          // Keep readers told how the text was produced after sign-off too.
          if (reviewed && r.draftedWith != null) ...[
            const SizedBox(height: 4),
            Text(s.t('reviewAiDisclosure'), style: tt.bodySmall),
          ],
        ],
      ),
    );
  }
}

class _SegmentView extends StatelessWidget {
  const _SegmentView({required this.segment, required this.numbers});
  final Segment segment;
  final Map<String, int> numbers;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final color = c.forKind(segment.kind);
    final label = switch (segment.kind) {
      SegmentKind.evidence => s.t('kindEvidence'),
      SegmentKind.tradition => s.t('kindTradition'),
      SegmentKind.disputed => s.t('kindDisputed'),
      SegmentKind.context => s.t('kindContext'),
      SegmentKind.note => s.t('kindNote'),
    };
    final isNote = segment.kind == SegmentKind.note;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
      child: Container(
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: color, width: isNote ? 1.5 : 3)),
        ),
        padding: const EdgeInsets.only(left: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label.toUpperCase(), style: tt.labelSmall?.copyWith(color: color, letterSpacing: 1.1)),
            if (segment.kind == SegmentKind.tradition)
              Text(s.t('kindTraditionHelp'), style: tt.bodySmall),
            const SizedBox(height: 4),
            Text(
              segment.text,
              style: (isNote ? tt.bodyMedium?.copyWith(color: c.inkMuted, fontStyle: FontStyle.italic) : tt.bodyLarge),
            ),
            if (segment.cites.isNotEmpty) ...[
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final cite in segment.cites)
                    _CiteChip(cite: cite, number: numbers[cite.sourceId] ?? 0),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _CiteChip extends StatelessWidget {
  const _CiteChip({required this.cite, required this.number});
  final Cite cite;
  final int number;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final src = state.library.source(cite.sourceId);
    final c = PPColors.of(context);
    final tt = Theme.of(context).textTheme;
    final s = S.of(context);
    final label = '${s.t('sources')} $number${cite.pages != null ? ', ${cite.pages}' : ''}';
    return Semantics(
      button: true,
      label: '$label: ${src?.title ?? cite.sourceId}',
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => showSourceSheet(context, cite.sourceId, pages: cite.pages),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48, minWidth: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10),
            // Size to the label (min 48×48 tap target) rather than filling the
            // row, so citations sit after the paragraph instead of centred.
            child: Center(
              widthFactor: 1,
              heightFactor: 1,
              child: Text(
                '[$number]${cite.pages != null ? ' ${cite.pages}' : ''}',
                style: tt.labelMedium?.copyWith(color: c.saffron, decoration: TextDecoration.underline, decorationColor: c.saffron),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _MediaSection extends StatelessWidget {
  const _MediaSection({required this.entry});
  final Entry entry;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    if (entry.media.isEmpty) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.image_not_supported_outlined, size: 16, color: c.inkMuted),
            const SizedBox(width: 6),
            Expanded(child: Text(s.t('noImages'), style: tt.bodySmall)),
          ],
        ),
      );
    }
    return Column(
      children: [
        for (final m in entry.media)
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: AspectRatio(
                    aspectRatio: 3 / 2,
                    child: m.asset != null
                        ? Image.asset(m.asset!, fit: BoxFit.cover, semanticLabel: m.caption)
                        : CustomPaint(painter: _PatternPainter(c), child: Semantics(label: m.caption)),
                  ),
                ),
                const SizedBox(height: 6),
                if (m.caption.isNotEmpty) Text(m.caption, style: tt.bodyMedium),
                Text('${s.t('mediaCredit')}: ${m.credit}', style: tt.bodySmall),
                Text('${s.t('mediaLicense')}: ${m.license}', style: tt.bodySmall),
              ],
            ),
          ),
      ],
    );
  }
}

/// Test pattern for development fixtures. Never used for real content.
class _PatternPainter extends CustomPainter {
  _PatternPainter(this.c);
  final PPColors c;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = c.paperRaised);
    final p = Paint()
      ..color = c.rule
      ..strokeWidth = 1;
    for (double x = -size.height; x < size.width; x += 18) {
      canvas.drawLine(Offset(x, size.height), Offset(x + size.height, 0), p);
    }
  }

  @override
  bool shouldRepaint(covariant _PatternPainter old) => old.c != c;
}

class _LocationSection extends StatelessWidget {
  const _LocationSection({required this.entry, required this.sourceNumber});
  final Entry entry;
  final int? sourceNumber;

  @override
  Widget build(BuildContext context) {
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    final loc = entry.location;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionHeader(s.t('location')),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: loc == null
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.t('noLocation'), style: tt.titleSmall),
                    if (entry.locationNote.isNotEmpty)
                      Text(entry.locationNote, style: tt.bodySmall),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${loc.lat.toStringAsFixed(5)}° N, ${loc.lng.toStringAsFixed(5)}° E',
                      style: tt.bodyLarge?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${loc.status == LocationStatus.verified ? s.t('coordsVerified') : s.t('coordsSourced')}'
                      '${sourceNumber != null && sourceNumber! > 0 ? ' [${sourceNumber!}]' : ''}',
                      style: tt.bodySmall?.copyWith(color: loc.status == LocationStatus.verified ? c.verified : c.disputed),
                    ),
                    const SizedBox(height: 10),
                    // Google Maps URLs are free to use and need no API key; they
                    // open the maps app if installed, otherwise the browser.
                    OutlinedButton.icon(
                      icon: const Icon(Icons.map_outlined),
                      label: Text(s.t('openInMaps')),
                      onPressed: () => openSourceUrl(context, googleMapsUrl(loc.lat, loc.lng)),
                    ),
                  ],
                ),
        ),
      ],
    );
  }
}

class _SourceLine extends StatelessWidget {
  const _SourceLine({required this.number, required this.sourceId, this.pages});
  final int number;
  final String sourceId;
  final String? pages;

  @override
  Widget build(BuildContext context) {
    final src = AppScope.of(context).library.source(sourceId);
    final s = S.of(context);
    final tt = Theme.of(context).textTheme;
    final c = PPColors.of(context);
    if (src == null) return const SizedBox.shrink();
    return MergeSemantics(
      child: InkWell(
        onTap: () => showSourceSheet(context, sourceId, pages: pages),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(width: 30, child: Text('$number.', style: tt.labelLarge?.copyWith(color: c.saffron))),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(src.citation, style: tt.bodyMedium),
                    if (pages != null) Text('${s.t('pages')}: $pages', style: tt.bodySmall),
                    const SizedBox(height: 2),
                    Text(
                      src.consulted ? s.t('consulted') : s.t('notConsulted'),
                      style: tt.labelSmall?.copyWith(color: src.consulted ? c.verified : c.disputed),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: c.inkMuted),
            ],
          ),
        ),
      ),
    );
  }
}

/// A Google Maps link that drops a pin at the given point.
String googleMapsUrl(double lat, double lng) =>
    'https://www.google.com/maps/search/?api=1&query=${lat.toStringAsFixed(6)},${lng.toStringAsFixed(6)}';
