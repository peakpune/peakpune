import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'theme.dart';
import 'tokens.dart';

/// A white card with a 4 px Ink outline (`.card`). When pressed it lifts onto the
/// 6 px hard Ink shadow the site shows on hover (`--lift`), with a ripple.
class InkCard extends StatefulWidget {
  const InkCard({super.key, required this.child, this.onTap, this.color = PP.white, this.padding = const EdgeInsets.all(PP.s5), this.semanticLabel});

  final Widget child;
  final VoidCallback? onTap;
  final Color color;
  final EdgeInsetsGeometry padding;
  final String? semanticLabel;

  @override
  State<InkCard> createState() => _InkCardState();
}

class _InkCardState extends State<InkCard> {
  bool _down = false;

  void _set(bool v) {
    if (_down != v && mounted) setState(() => _down = v);
  }

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(PP.rCard);
    final lifted = _down && widget.onTap != null;
    final card = AnimatedContainer(
      duration: PP.fast,
      curve: Curves.easeOut,
      transform: Matrix4.translationValues(lifted ? -3 : 0, lifted ? -3 : 0, 0),
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: [BoxShadow(color: PP.ink, offset: Offset(lifted ? PP.lift : 0, lifted ? PP.lift : 0))],
      ),
      child: Material(
        color: widget.color,
        shape: RoundedRectangleBorder(borderRadius: radius, side: const BorderSide(color: PP.ink, width: PP.outline)),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: widget.onTap,
          onHighlightChanged: _set,
          splashColor: PP.haldi.withValues(alpha: 0.35),
          highlightColor: PP.clay.withValues(alpha: 0.25),
          child: Padding(padding: widget.padding, child: widget.child),
        ),
      ),
    );
    return Semantics(
      button: widget.onTap != null,
      label: widget.semanticLabel,
      child: ConstrainedBox(constraints: const BoxConstraints(minHeight: PP.tap), child: card),
    );
  }
}

/// Small uppercase Brick label above a title (`.eyebrow`).
class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color = PP.brick});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) =>
      Text(text.toUpperCase(), style: Theme.of(context).textTheme.labelSmall!.copyWith(color: color));
}

/// Sage pill for tags (`.tags li`).
class TagPill extends StatelessWidget {
  const TagPill(this.text, {super.key, this.color = PP.sage});
  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: PP.s3, vertical: PP.s1),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(PP.rPill)),
        child: Text(text, style: inter(14, 500, height: 20 / 14, color: PP.onFill(color))),
      );
}

/// Outlined pill badge (`.level`): Easy on Sage, Moderate on Haldi, Hard on Brick.
class LevelBadge extends StatelessWidget {
  const LevelBadge(this.text, {super.key, required this.fill});
  final String text;
  final Color fill;

  static Color fillFor(String? difficulty) => switch (difficulty?.toLowerCase()) {
        'easy' => PP.sage,
        'moderate' => PP.haldi,
        'challenging' || 'hard' => PP.brick,
        _ => PP.paper,
      };

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: PP.s3, vertical: 2),
        decoration: BoxDecoration(
          color: fill,
          borderRadius: BorderRadius.circular(PP.rPill),
          border: Border.all(color: fill == PP.brick ? PP.brick : PP.ink),
        ),
        child: Text(text, style: inter(14, 600, height: 20 / 14, color: PP.onFill(fill))),
      );
}

/// The Haldi signboard: 5 px Ink border, 8 px hard shadow, tilted 2 degrees (`.sign`).
class Signboard extends StatelessWidget {
  const Signboard({super.key, required this.text, this.small, this.tilt = -2});
  final String text;
  final String? small;
  final double tilt;

  @override
  Widget build(BuildContext context) => Transform.rotate(
        angle: tilt * math.pi / 180,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: PP.s6, vertical: PP.s8),
          decoration: BoxDecoration(
            color: PP.haldi,
            borderRadius: BorderRadius.circular(PP.rCard),
            border: Border.all(color: PP.ink, width: 5),
            boxShadow: const [BoxShadow(color: PP.ink, offset: Offset(PP.signShadow, PP.signShadow))],
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(text, textAlign: TextAlign.center, style: fraunces(26, 700, height: 1.3)),
            if (small != null) ...[
              const SizedBox(height: PP.s4),
              Text(small!.toUpperCase(), textAlign: TextAlign.center, style: inter(12, 600, height: 16 / 12, letterSpacing: 1.2)),
            ],
          ]),
        ),
      );
}

/// A flat category block (`.category`): fills cycle Brick, Haldi, Sage, Clay.
class CategoryTile extends StatelessWidget {
  const CategoryTile({super.key, required this.index, required this.title, required this.subtitle, required this.icon, required this.onTap});
  final int index;
  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final fill = PP.blockCycle[index % PP.blockCycle.length];
    final fg = PP.onFill(fill);
    return Semantics(
      button: true,
      label: '$title. $subtitle',
      excludeSemantics: true,
      child: Material(
        color: fill,
        borderRadius: BorderRadius.circular(PP.rCard),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          splashColor: PP.ink.withValues(alpha: 0.12),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 128),
            child: Padding(
              padding: const EdgeInsets.all(PP.s5),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Icon(icon, color: fg, size: 26),
                const SizedBox(height: PP.s4),
                Text(title, style: fraunces(21, 600, height: 26 / 21, color: fg)),
                const SizedBox(height: PP.s1),
                Text(subtitle, style: inter(14, 600, height: 20 / 14, color: fg)),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Section heading with an optional "more" link (`.section-head`).
class SectionHead extends StatelessWidget {
  const SectionHead({super.key, required this.title, this.note, this.more, this.onMore});
  final String title;
  final String? note;
  final String? more;
  final VoidCallback? onMore;

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(PP.s4, PP.s8, PP.s4, PP.s4),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Expanded(child: Semantics(header: true, child: Text(title, style: t.headlineSmall))),
          if (more != null) TextButton(onPressed: onMore, child: Text(more!)),
        ]),
        if (note != null) ...[const SizedBox(height: PP.s1), Text(note!, style: t.bodySmall)],
      ]),
    );
  }
}

/// A Clay notice box (`.flag`), used for honesty notes such as stale sources.
class FlagNote extends StatelessWidget {
  const FlagNote(this.text, {super.key, this.icon = Icons.history_toggle_off, this.color = PP.clay});
  final String text;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: PP.s4, vertical: PP.s3),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(PP.rInput)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(icon, size: 20, color: PP.onFill(color)),
          const SizedBox(width: PP.s3),
          Expanded(child: Text(text, style: inter(15, 500, height: 1.45, color: PP.onFill(color)))),
        ]),
      );
}

/// Pill tabs with a Brick current tab, as the site's navigation. Haptic on change.
class PillTabs extends StatelessWidget {
  const PillTabs({super.key, required this.tabs});
  final List<String> tabs;

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.symmetric(horizontal: PP.s4),
        padding: const EdgeInsets.all(PP.s1),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(PP.rPill), border: Border.all(color: PP.ink, width: 2)),
        child: TabBar(
          tabs: [for (final t in tabs) Tab(height: PP.tap, child: Text(t, textAlign: TextAlign.center))],
          onTap: (_) => Feedback.forTap(context),
          splashBorderRadius: BorderRadius.circular(PP.rPill),
        ),
      );
}
