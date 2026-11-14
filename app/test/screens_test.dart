import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  testWidgets('first launch: one welcome screen, then straight to content', (tester) async {
    final state = await pumpApp(tester, welcomeSeen: false);
    expect(find.text('Start exploring'), findsOneWidget);
    await tester.tap(find.text('Start exploring'));
    await tester.pumpAndSettle();
    expect(state.welcomeSeen, isTrue);
    expect(find.text('This weekend in Pune'), findsOneWidget);
  });

  testWidgets('all five tabs open', (tester) async {
    await pumpApp(tester);
    expect(find.text('This weekend in Pune'), findsOneWidget);
    await tester.tap(find.text('Explore').last);
    await tester.pumpAndSettle();
    expect(find.text('Places, checked at the source.'), findsOneWidget);
    await tester.tap(find.text('Outdoors').last);
    await tester.pumpAndSettle();
    expect(find.text('Loops and treks'), findsWidgets);
    await tester.tap(find.text('Plans').last);
    await tester.pumpAndSettle();
    expect(find.text('Events and meetups'), findsOneWidget);
    await tester.tap(find.text('Metro').last);
    await tester.pumpAndSettle();
    expect(find.text('Journey planner'), findsOneWidget);
  });

  testWidgets('this weekend shows dated plans for Saturday and Sunday', (tester) async {
    await pumpApp(tester);
    await scrollTo(tester, find.text('Union Bank of India CME Soldierathon Pune, 4th edition'));
    expect(find.text('Union Bank of India CME Soldierathon Pune, 4th edition'), findsOneWidget);
    expect(find.text('Kamshet Paragliding'), findsNothing);
  });

  testWidgets('a place opens a real detail page with prices, sources and the checked date', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Explore').last);
    await tester.pumpAndSettle();
    await tapText(tester, 'Toit Pune');
    expect(find.text('Price not confirmed'), findsOneWidget); // never "Free"
    await scrollTo(tester, find.text('Checked on 13 November 2026.'));
    expect(find.text('Checked on 13 November 2026.'), findsOneWidget);
    expect(find.text('Sources'), findsOneWidget);
    expect(find.byTooltip('Share'), findsOneWidget);
  });

  testWidgets('search narrows the places list and says when nothing matches', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Explore').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'kelkar');
    await tester.pumpAndSettle();
    await scrollTo(tester, find.text('Raja Dinkar Kelkar Museum'));
    expect(find.text('Raja Dinkar Kelkar Museum'), findsOneWidget);
    await tester.drag(find.byType(CustomScrollView), const Offset(0, 3000));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'zzzz');
    await tester.pumpAndSettle();
    expect(find.text('Nothing matches that.'), findsOneWidget);
  });

  testWidgets('entries older than 90 days are flagged for a re-check', (tester) async {
    await pumpApp(tester, now: DateTime.parse('2027-03-01T09:00:00+05:30'));
    await tester.tap(find.text('Explore').last);
    await tester.pumpAndSettle();
    await tapText(tester, 'Raja Dinkar Kelkar Museum');
    expect(find.textContaining('This needs a re-check'), findsOneWidget);
  });

  testWidgets('expired events hide themselves; recurring listings stay', (tester) async {
    await pumpApp(tester, now: DateTime.parse('2026-11-16T09:00:00+05:30'));
    await tester.tap(find.text('Plans').last);
    await tester.pumpAndSettle();
    expect(find.text('Union Bank of India CME Soldierathon Pune, 4th edition'), findsNothing);
    await scrollTo(tester, find.text('Recurring at venues'));
    expect(find.text('Recurring at venues'), findsOneWidget);
  });

  testWidgets('a dated event offers add to calendar; meetups offer a join link', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Plans').last);
    await tester.pumpAndSettle();
    await tapText(tester, 'Union Bank of India CME Soldierathon Pune, 4th edition');
    expect(find.text('Add to calendar'), findsOneWidget);
    await tester.pageBack();
    await tester.pumpAndSettle();
    await tester.tap(find.text('Meetups'));
    await tester.pumpAndSettle();
    await tapText(tester, 'PuneRunners Club');
    expect(find.text('How to join'), findsOneWidget);
  });

  testWidgets('metro: choose two stations and get legs and a fare', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Metro').last);
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel(RegExp('^Boarding station')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Vanaz');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Vanaz').last);
    await tester.pumpAndSettle();
    await tester.tap(find.bySemanticsLabel(RegExp('^Destination station')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Swargate');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Swargate').last);
    await tester.pumpAndSettle();
    expect(find.text('Change at District Court.'), findsOneWidget);
    expect(find.textContaining('₹'), findsWidgets);
  });

  testWidgets('history: honest empty state until the file is supplied', (tester) async {
    await pumpApp(tester);
    await tapText(tester, 'History');
    expect(find.text('The timeline is still being checked.'), findsOneWidget);
  });

  testWidgets('history: Marathi toggle, English fallback flagged, sources shown', (tester) async {
    await pumpApp(tester, library: await tester.runAsync(withSamples), systemLanguage: 'mr');
    await tapText(tester, 'History');
    expect(find.text('शनिवारवाड्याची पायाभरणी'), findsOneWidget); // defaults to the system locale
    expect(find.text('Marathi text not available yet; shown in English.'), findsOneWidget);
    await tester.tap(find.text('English'));
    await tester.pumpAndSettle();
    await tapText(tester, 'Shaniwar Wada foundation laid');
    await scrollTo(tester, find.textContaining('Sample source'));
    expect(find.textContaining('Sample source'), findsOneWidget);
  });

  testWidgets('shopping: since year only where verified, with sources', (tester) async {
    await pumpApp(tester, library: await tester.runAsync(withSamples));
    await tapText(tester, 'Shopping');
    expect(find.text('Tulshibaug'), findsOneWidget);
    await tester.tap(find.text('Old shops'));
    await tester.pumpAndSettle();
    expect(find.text('SINCE 1925 · LAXMI ROAD'), findsOneWidget); // eyebrows are uppercase
    await tester.tap(find.text('Sample Old Shop'));
    await tester.pumpAndSettle();
    await scrollTo(tester, find.textContaining('Shop history page'));
    expect(find.textContaining('Shop history page'), findsOneWidget);
  });

  testWidgets('about shows checked dates and links', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.byTooltip('About Peak Pune'));
    await tester.pumpAndSettle();
    expect(find.text('Publication audit of 13 November 2026'), findsOneWidget);
    expect(find.text('peakpune.com'), findsOneWidget);
  });

  testWidgets('text at 130 % renders main screens and a detail page without overflow', (tester) async {
    await pumpApp(tester, textScale: 1.3);
    expect(tester.takeException(), isNull);
    for (final tab in ['Explore', 'Outdoors', 'Plans', 'Metro']) {
      await tester.tap(find.text(tab).last);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: tab);
    }
    await tester.tap(find.text('Explore').last);
    await tester.pumpAndSettle();
    await tapText(tester, 'Raja Dinkar Kelkar Museum');
    expect(tester.takeException(), isNull);
  });

  testWidgets('touch targets and labels meet Android guidelines on the main screens', (tester) async {
    final handle = tester.ensureSemantics();
    await pumpApp(tester);
    for (final tab in ['Home', 'Explore', 'Outdoors', 'Plans', 'Metro']) {
      await tester.tap(find.text(tab).last);
      await tester.pumpAndSettle();
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline), reason: tab);
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline), reason: tab);
    }
    handle.dispose();
  });
}
