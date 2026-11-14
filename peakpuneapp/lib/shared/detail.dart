import 'package:flutter/material.dart';

import '../data/honesty.dart';
import '../data/models.dart';
import '../state/app_state.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';
import 'actions.dart';

/// One fact row (`.place-facts`): label above value on phones.
class Fact {
  const Fact(this.label, this.value, {this.link});
  final String label;
  final String value;
  final String? link;
}

/// A button on a detail page.
class DetailAction {
  const DetailAction(this.label, this.icon, this.onPressed, {this.primary = false});
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final bool primary;
}

/// The full page every list item opens: summary, facts, tags, actions, honesty
/// flags, sources and the checked date.
class DetailPage extends StatelessWidget {
  const DetailPage({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.summary,
    required this.sources,
    required this.checkedAt,
    required this.shareUrl,
    this.shareLine,
    this.badges = const [],
    this.facts = const [],
    this.tags = const [],
    this.actions = const [],
    this.flags = const [],
    this.provenance,
    this.titleStyle,
    this.summaryStyle,
    this.osmCredit = false,
    this.extra = const [],
  });

  final String eyebrow;
  final String title;
  final String summary;
  final List<SourceLink> sources;
  final DateTime? checkedAt;
  final String shareUrl;
  final String? shareLine;
  final List<Widget> badges;
  final List<Fact> facts;
  final List<String> tags;
  final List<DetailAction> actions;
  final List<String> flags;
  final String? provenance;
  final TextStyle? titleStyle;
  final TextStyle? summaryStyle;
  final bool osmCredit;
  final List<Widget> extra;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    final now = AppScope.of(context).now();
    final stale = checkedAt != null && needsRecheck(checkedAt!, now);
    return Scaffold(
      appBar: AppBar(
        title: Text(eyebrow, style: inter(16, 700)),
        actions: [
          IconButton(
            tooltip: 'Share',
            icon: const Icon(Icons.ios_share),
            onPressed: () => shareEntry(context, title: title, line: shareLine, url: shareUrl),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(PP.s4, PP.s6, PP.s4, PP.s12),
        children: [
          Semantics(header: true, child: Text(title, style: titleStyle ?? t.headlineMedium)),
          if (badges.isNotEmpty) ...[
            const SizedBox(height: PP.s4),
            Wrap(spacing: PP.s2, runSpacing: PP.s2, children: badges),
          ],
          const SizedBox(height: PP.s4),
          Text(summary, style: summaryStyle ?? t.bodyLarge),
          if (stale || flags.isNotEmpty) const SizedBox(height: PP.s5),
          if (stale)
            Padding(
              padding: const EdgeInsets.only(bottom: PP.s2),
              child: FlagNote('Checked more than $staleAfterDays days ago (on ${longDate(checkedAt!)}). This needs a re-check: confirm with the source before you go.', color: PP.haldi),
            ),
          for (final f in flags) Padding(padding: const EdgeInsets.only(bottom: PP.s2), child: FlagNote(f)),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: PP.s4),
            Wrap(spacing: PP.s3, runSpacing: PP.s3, children: [
              for (final a in actions)
                a.primary
                    ? FilledButton.icon(onPressed: a.onPressed, icon: Icon(a.icon, size: 20), label: Text(a.label))
                    : OutlinedButton.icon(onPressed: a.onPressed, icon: Icon(a.icon, size: 20), label: Text(a.label)),
            ]),
          ],
          if (facts.isNotEmpty) ...[
            const SizedBox(height: PP.s8),
            const Divider(color: PP.ink, thickness: 2, height: 2),
            for (final f in facts) _FactRow(f),
          ],
          if (tags.isNotEmpty) ...[
            const SizedBox(height: PP.s6),
            Wrap(spacing: PP.s2, runSpacing: PP.s2, children: [for (final tag in tags) TagPill(tag)]),
          ],
          ...extra,
          const SizedBox(height: PP.s8),
          SourcesBlock(sources: sources, checkedAt: checkedAt, provenance: provenance, osmCredit: osmCredit),
        ],
      ),
    );
  }
}

class _FactRow extends StatelessWidget {
  const _FactRow(this.f);
  final Fact f;

  @override
  Widget build(BuildContext context) {
    final value = Text(f.value, style: inter(17, 500, height: 26 / 17, color: f.link != null ? PP.brick : PP.ink).copyWith(decoration: f.link != null ? TextDecoration.underline : null));
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: PP.rule))),
      padding: const EdgeInsets.symmetric(vertical: PP.s3),
      child: MergeSemantics(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(f.label, style: inter(14, 600, color: PP.inkSoft, letterSpacing: 0.3)),
          const SizedBox(height: 2),
          if (f.link == null)
            value
          else
            InkWell(
              onTap: () => openLink(context, f.link!),
              child: ConstrainedBox(constraints: const BoxConstraints(minHeight: PP.tap), child: Align(alignment: Alignment.centerLeft, child: value)),
            ),
        ]),
      ),
    );
  }
}

/// The provenance box (`.provenance`): tappable sources and the checked date.
class SourcesBlock extends StatelessWidget {
  const SourcesBlock({super.key, required this.sources, required this.checkedAt, this.provenance, this.osmCredit = false});
  final List<SourceLink> sources;
  final DateTime? checkedAt;
  final String? provenance;
  final bool osmCredit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(PP.s5),
      decoration: BoxDecoration(color: PP.clay, borderRadius: BorderRadius.circular(PP.rCard)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Semantics(header: true, child: Text(sources.length == 1 ? 'Source' : 'Sources', style: fraunces(23, 600))),
        const SizedBox(height: PP.s2),
        if (checkedAt != null)
          Text('Checked on ${longDate(checkedAt!)}.', style: inter(15, 600, height: 23 / 15))
        else
          Text('Check date not stated.', style: inter(15, 600, height: 23 / 15)),
        if (provenance != null) ...[const SizedBox(height: PP.s2), Text(provenance!, style: inter(15, 400, height: 23 / 15))],
        const SizedBox(height: PP.s3),
        for (final s in sources)
          Semantics(
            link: true,
            label: 'Open source: ${s.title}',
            excludeSemantics: true,
            child: InkWell(
              onTap: () => openLink(context, s.url),
              borderRadius: BorderRadius.circular(PP.rInput),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: PP.tap),
                child: Row(children: [
                  const Icon(Icons.north_east, size: 18),
                  const SizedBox(width: PP.s2),
                  Expanded(
                    child: Text(
                      s.label == null ? s.url : '${s.label} · ${Uri.tryParse(s.url)?.host.replaceFirst('www.', '') ?? s.url}',
                      style: inter(15, 600, height: 1.4).copyWith(decoration: TextDecoration.underline),
                    ),
                  ),
                ]),
              ),
            ),
          ),
        if (osmCredit) ...[
          const SizedBox(height: PP.s2),
          Text('Map coordinates © OpenStreetMap contributors (ODbL).', style: inter(13, 500, height: 1.4)),
        ],
        const SizedBox(height: PP.s2),
        Text('Opening a source needs the internet.', style: inter(13, 500, height: 1.4, color: PP.inkSoft)),
      ]),
    );
  }
}

/// A list card (`.card`): eyebrow, Fraunces title, summary and a meta line.
class EntryCard extends StatelessWidget {
  const EntryCard({super.key, required this.eyebrow, required this.title, this.summary, this.meta = const [], this.footer, required this.onTap, this.titleStyle, this.summaryStyle});
  final String eyebrow;
  final String title;
  final String? summary;
  final List<Widget> meta;
  final String? footer;
  final VoidCallback onTap;
  final TextStyle? titleStyle;
  final TextStyle? summaryStyle;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return InkCard(
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Eyebrow(eyebrow),
        const SizedBox(height: PP.s2),
        Text(title, style: titleStyle ?? t.titleLarge),
        if (summary != null && summary!.isNotEmpty) ...[
          const SizedBox(height: PP.s2),
          Text(summary!, maxLines: 3, overflow: TextOverflow.ellipsis, style: summaryStyle ?? inter(16, 400, height: 1.5, color: PP.inkSoft)),
        ],
        if (meta.isNotEmpty) ...[const SizedBox(height: PP.s3), Wrap(spacing: PP.s2, runSpacing: PP.s2, crossAxisAlignment: WrapCrossAlignment.center, children: meta)],
        if (footer != null) ...[const SizedBox(height: PP.s2), Text(footer!, style: t.bodySmall)],
      ]),
    );
  }
}

/// Meta text beside badges in a card.
class MetaText extends StatelessWidget {
  const MetaText(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Text(text, style: inter(14, 500, height: 20 / 14));
}

/// Empty, loading-failure and "nothing here yet" states. Every one offers a way on.
class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.title, required this.message, this.actions = const [], this.icon = Icons.wb_twilight});
  final String title;
  final String message;
  final List<DetailAction> actions;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: PP.s6, vertical: PP.s10),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(PP.s4),
            decoration: BoxDecoration(color: PP.sage, shape: BoxShape.circle, border: Border.all(color: PP.ink, width: 2)),
            child: Icon(icon, size: 32, color: PP.ink),
          ),
          const SizedBox(height: PP.s5),
          Text(title, textAlign: TextAlign.center, style: fraunces(24, 800, height: 1.2)),
          const SizedBox(height: PP.s2),
          Text(message, textAlign: TextAlign.center, style: inter(16, 400, height: 1.5, color: PP.inkSoft)),
          if (actions.isNotEmpty) ...[
            const SizedBox(height: PP.s5),
            Wrap(alignment: WrapAlignment.center, spacing: PP.s3, runSpacing: PP.s3, children: [
              for (final a in actions)
                a.primary ? FilledButton(onPressed: a.onPressed, child: Text(a.label)) : OutlinedButton(onPressed: a.onPressed, child: Text(a.label)),
            ]),
          ],
        ]),
      );
}

/// Pushes a detail page with the theme's shared-axis transition.
void openPage(BuildContext context, Widget page) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => page));
