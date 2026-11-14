import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:punepedia/ui/entry/entry_screen.dart';

import 'helpers.dart';

void main() {
  testWidgets('all four sections open from the navigation bar', (tester) async {
    await pumpApp(tester);
    expect(find.text('Featured story'), findsOneWidget);

    await tester.tap(find.text('Timeline'));
    await tester.pumpAndSettle();
    expect(find.text('Show research leads'), findsOneWidget);
    expect(find.text('Peshwa Pune'), findsWidgets);

    await tester.tap(find.text('Explore'));
    await tester.pumpAndSettle();
    expect(find.text('Places'), findsWidgets);

    expect(find.text('Map'), findsNothing);

    await tester.tap(find.text('Saved').last);
    await tester.pumpAndSettle();
    expect(find.text('Offline library'), findsOneWidget);
  });

  testWidgets('featured story opens with status, review notice and sources', (tester) async {
    await pumpApp(tester);
    await openFeaturedStory(tester);
    expect(find.text('Who started Pune\'s public Ganeshotsav?'), findsOneWidget);
    expect(find.text('Disputed'), findsWidgets);
    expect(find.text('Last reviewed 2026-10-31 by OverTime Labs'), findsOneWidget);
    expect(find.textContaining('Drafted with AI assistance'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Sources'), 300, scrollable: verticalScrollable.first);
    await scrollToFirst(tester, find.textContaining('Press Trust of India'));
    expect(find.textContaining('Press Trust of India'), findsWidgets);
  });

  testWidgets('tapping a citation opens the source viewer', (tester) async {
    await pumpApp(tester);
    await openFeaturedStory(tester);
    await scrollToFirst(tester, find.text('[1]'));
    await tester.tap(find.text('[1]').first);
    await tester.pumpAndSettle();
    final sheet = find.byType(DraggableScrollableSheet);
    expect(find.descendant(of: sheet, matching: find.text('Read by PunePedia')), findsOneWidget);
    await scrollToFirst(tester, find.text('Open source'), within: sheet);
    expect(find.text('Open source'), findsOneWidget);
    expect(find.textContaining('business-standard.com'), findsOneWidget);
  });

  testWidgets('bookmarking an entry shows it under Saved', (tester) async {
    await pumpApp(tester);
    await openFeaturedStory(tester);
    await tester.tap(find.byTooltip('Save this entry'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('Remove from saved'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Saved').last);
    await tester.pumpAndSettle();
    expect(find.text('Who started Pune\'s public Ganeshotsav?'), findsOneWidget);
  });

  testWidgets('the interface is English-only, with no language switch', (tester) async {
    await pumpApp(tester);
    expect(find.text('मराठी'), findsNothing);
    await tester.tap(find.byTooltip('Settings').first);
    await tester.pumpAndSettle();
    expect(find.text('Language'), findsNothing);
    expect(find.text('Appearance'), findsOneWidget);
  });

  testWidgets('search finds entries and reports the result count', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Search places, people, events…'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Vishrambaug');
    await tester.pumpAndSettle();
    expect(find.textContaining('results'), findsOneWidget);
    expect(find.text('Vishrambaug Wada'), findsOneWidget);
  });

  testWidgets('research leads stay hidden until switched on', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Timeline'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Research lead:'), findsNothing);
    await tester.tap(find.text('Show research leads'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.textContaining('Research lead:').first, 300, scrollable: verticalScrollable.first);
    expect(find.textContaining('Research lead:'), findsWidgets);
  });

  testWidgets('empty topics say so instead of showing filler', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Explore'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Food'));
    await tester.pumpAndSettle();
    expect(find.textContaining('No entries in this topic have passed sourcing yet'), findsOneWidget);
  });

  testWidgets('reading works with large text and at 1.6x reader scale', (tester) async {
    await pumpApp(tester, prefs: {'textScale': 1.6});
    expect(tester.takeException(), isNull);
    await openFeaturedStory(tester);
    expect(tester.takeException(), isNull);
  });

  testWidgets('meets accessibility guidelines on main screens', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpApp(tester);
    for (final tab in ['Discover', 'Timeline', 'Explore', 'Saved']) {
      await tester.tap(find.text(tab).last);
      await tester.pumpAndSettle();
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
    }
    handle.dispose();
  });

  testWidgets('dark mode renders', (tester) async {
    await pumpApp(tester, prefs: {'theme': 'dark'});
    final ctx = tester.element(find.text('Featured story'));
    expect(Theme.of(ctx).brightness, Brightness.dark);
  });

  testWidgets('a place with checked coordinates links to Google Maps', (tester) async {
    await pumpApp(tester, store: FakeUnlockStore(ownsUnlock: true));
    await openEntryById(tester, 'vishrambaug-wada');
    await scrollToFirst(tester, find.text('Open in Google Maps'));
    expect(find.textContaining('Coordinates checked by PunePedia.'), findsOneWidget);
    expect(find.text('Open in Google Maps'), findsOneWidget);
    expect(googleMapsUrl(18.5136, 73.8521), 'https://www.google.com/maps/search/?api=1&query=18.513600,73.852100');
  });
}
