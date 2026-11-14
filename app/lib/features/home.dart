import 'package:flutter/material.dart';

import '../data/honesty.dart';
import '../data/models.dart';
import '../shared/detail.dart';
import '../state/app_state.dart';
import '../theme/theme.dart';
import '../theme/tokens.dart';
import '../theme/widgets.dart';
import 'about.dart';
import 'explore.dart';
import 'history.dart';
import 'plans.dart';
import 'shopping.dart';

/// The Peak Pune mark from site/mark.svg.html: a Haldi signboard with a hill and a Brick sun.
class PeakMark extends StatelessWidget {
  const PeakMark({super.key, this.size = 34});
  final double size;

  @override
  Widget build(BuildContext context) => SizedBox(width: size * 36 / 40, height: size, child: CustomPaint(painter: _MarkPainter()));
}

class _MarkPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 36, size.height / 40);
    final ink = Paint()..color = PP.ink;
    canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(5, 5, 29, 33), const Radius.circular(4)), ink);
    final board = RRect.fromRectAndRadius(const Rect.fromLTWH(1.5, 1.5, 29, 33), const Radius.circular(4));
    canvas.drawRRect(board, Paint()..color = PP.haldi);
    canvas.drawRRect(board, Paint()
      ..color = PP.ink
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3);
    canvas.drawPath(Path()..moveTo(5, 28)..lineTo(13, 15)..lineTo(18, 22)..lineTo(22, 16)..lineTo(28, 28)..close(), ink);
    canvas.drawCircle(const Offset(23, 9), 3, Paint()..color = PP.brick);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// "Peak Pune" wordmark with Pune in Brick (`.wordmark span`).
class Wordmark extends StatelessWidget {
  const Wordmark({super.key});

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Peak Pune',
        excludeSemantics: true,
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const PeakMark(size: 30),
          const SizedBox(width: PP.s3),
          // Scales down rather than overflowing beside app-bar actions at large text sizes.
          Flexible(
            child: FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text.rich(TextSpan(style: fraunces(24, 800), children: const [TextSpan(text: 'Peak '), TextSpan(text: 'Pune', style: TextStyle(color: PP.brick))])),
            ),
          ),
        ]),
      );
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    final lib = state.library;
    final now = state.now();
    final weekend = thisWeekend(lib.events, now);
    final upcoming = currentEvents(lib.events, now).where((e) => !e.isRecurring).take(3).toList();
    final featured = lib.places.where((p) => p.status == Verification.verified && p.hours != null).take(4).toList();
    final t = Theme.of(context).textTheme;

    final tiles = <(String, String, IconData, VoidCallback)>[
      ('Places', '${lib.places.length} checked at the source', Icons.place_outlined, () => state.goTab(1)),
      ('Loops and treks', '${lib.runs.length} city loops, ${lib.treks.length} trips', Icons.terrain_outlined, () => state.goTab(2)),
      ('Events', 'Plans, with sources', Icons.event_outlined, () => state.goTab(3)),
      ('Pune Metro', 'Journey planner, works offline', Icons.tram_outlined, () => state.goTab(4)),
      ('History', lib.history.isEmpty ? 'Verified timeline, coming soon' : '${lib.history.length} verified entries', Icons.account_balance_outlined, () => openPage(context, const HistoryScreen())),
      ('Shopping', lib.shops.isEmpty && lib.shoppingAreas.isEmpty ? 'Markets and old shops, coming soon' : 'Markets and old shops', Icons.storefront_outlined, () => openPage(context, const ShoppingScreen())),
      ('Meetups', '${lib.meetups.length} communities to join', Icons.groups_outlined, () => state.goTab(3)),
      ('About', 'Who checks what, and when', Icons.info_outline, () => openPage(context, const AboutScreen())),
    ];

    return CustomScrollView(
      key: const PageStorageKey('home'),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(PP.s4, PP.s6, PP.s4, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Pune, checked at the source.', style: t.displaySmall),
              const SizedBox(height: PP.s3),
              Text('Places, loops and treks, plans and an offline metro guide. Every listing shows where it came from and when we checked.', style: inter(17, 500, height: 1.5)),
            ]),
          ),
        ),
        SliverToBoxAdapter(
          child: SectionHead(
            title: 'This weekend in Pune',
            note: 'Source-listed plans. Check dates and prices on the listing before you book.',
            more: 'All events',
            onMore: () => state.goTab(3),
          ),
        ),
        if (weekend.isNotEmpty)
          _cards([for (final e in weekend) EventCard(e: e)])
        else if (upcoming.isNotEmpty) ...[
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(PP.s4, 0, PP.s4, PP.s3),
              child: Text('Nothing listed for this weekend. Coming up next:', style: inter(15, 600)),
            ),
          ),
          _cards([for (final e in upcoming) EventCard(e: e)]),
        ] else
          SliverToBoxAdapter(
            child: EmptyState(
              icon: Icons.weekend_outlined,
              title: 'A quiet weekend.',
              message: 'No dated plans right now. A Puneri afternoon nap is also a plan. Or try a loop.',
              actions: [DetailAction('Loops and treks', Icons.terrain, () => state.goTab(2), primary: true)],
            ),
          ),
        const SliverToBoxAdapter(child: SectionHead(title: 'Browse')),
        // Two tiles per row, each row as tall as its tallest tile, so text can grow
        // to 130 % and beyond without clipping.
        SliverPadding(
          padding: const EdgeInsets.symmetric(horizontal: PP.s4),
          sliver: SliverList.separated(
            itemCount: (tiles.length / 2).ceil(),
            separatorBuilder: (_, _) => const SizedBox(height: PP.s4),
            itemBuilder: (context, row) => IntrinsicHeight(
              child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                for (var i = row * 2; i < row * 2 + 2; i++) ...[
                  if (i > row * 2) const SizedBox(width: PP.s4),
                  Expanded(
                    child: i < tiles.length
                        ? CategoryTile(index: i, title: tiles[i].$1, subtitle: tiles[i].$2, icon: tiles[i].$3, onTap: tiles[i].$4)
                        : const SizedBox.shrink(),
                  ),
                ],
              ]),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: SectionHead(
            title: 'Places, checked at the source',
            note: 'Hours and prices are shown only where checked.',
            more: 'All ${lib.places.length}',
            onMore: () => state.goTab(1),
          ),
        ),
        _cards([for (final p in featured) PlaceCard(place: p)]),
        const SliverToBoxAdapter(child: SizedBox(height: PP.s12)),
      ],
    );
  }

  Widget _cards(List<Widget> cards) => SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: PP.s4),
        sliver: SliverList.separated(itemCount: cards.length, separatorBuilder: (_, _) => const SizedBox(height: PP.s4), itemBuilder: (_, i) => cards[i]),
      );
}
