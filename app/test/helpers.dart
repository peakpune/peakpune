import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:peakpune/app.dart';
import 'package:peakpune/data/library.dart';
import 'package:peakpune/state/app_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Saturday 14 November 2026, 9 am in Pune.
final saturday = DateTime.parse('2026-11-14T09:00:00+05:30');

Library? _cached;
Future<Library> realLibrary() async => _cached ??= await Library.load(rootBundle);

/// The real library with sample history and shopping rows (the real files are not supplied yet).
Future<Library> withSamples() async {
  final l = await realLibrary();
  final shopping = parseShopping(jsonDecode('''{
    "areas":[{"id":"tulshibaug","name":"Tulshibaug","area":"Budhwar Peth","known_for":["brass and steel utensils"],"best_for":"household shopping","notes":null,"sources":["https://example.org/tulshibaug"]}],
    "shops":[{"id":"sample-shop","name":"Sample Old Shop","area":"Laxmi Road","known_for":"sarees","since":1925,"note":null,"sources":[{"label":"Shop history page","url":"https://example.org/shop"}],"checked_at":"2026-11-14"}]
  }'''));
  return Library(
    auditCheckedAt: l.auditCheckedAt, places: l.places, outdoors: l.outdoors, events: l.events, meetups: l.meetups,
    history: parseHistory(jsonDecode('''[
      {"id":"h1","era":"Peshwa Pune","year":1730,"date_label":"10 January 1730","title_en":"Shaniwar Wada foundation laid","title_mr":"शनिवारवाड्याची पायाभरणी","summary_en":"Sample summary in English.","summary_mr":"नमुना सारांश.","sources":[{"label":"Sample source","url":"https://example.org/h1"}],"checked_at":"2026-11-14"},
      {"id":"h2","era":"British Poona","year":1885,"title_en":"Fergusson College founded","summary_en":"Sample summary without Marathi.","sources":["https://example.org/h2"],"checked_at":"2026-11-14"}
    ]''')),
    historyLoaded: true, shoppingAreas: shopping.$1, shops: shopping.$2, shoppingLoaded: true, metro: l.metro,
  );
}

Future<AppState> pumpApp(
  WidgetTester tester, {
  DateTime? now,
  bool welcomeSeen = true,
  Library? library,
  double textScale = 1.0,
  String systemLanguage = 'en',
}) async {
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 3.0;
  tester.platformDispatcher.textScaleFactorTestValue = textScale;
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  SharedPreferences.setMockInitialValues({'welcome_seen': welcomeSeen});
  final prefs = await SharedPreferences.getInstance();
  final lib = library ?? await tester.runAsync(realLibrary);
  final state = AppState(library: lib!, prefs: prefs, clock: () => now ?? saturday, systemLanguage: systemLanguage);
  await tester.pumpWidget(PeakPuneApp(state: state));
  await tester.pumpAndSettle();
  return state;
}

/// Scrolls the first vertical list until [finder] is built, then into view.
Future<void> scrollTo(WidgetTester tester, Finder finder) async {
  final scrollable = find.byWidgetPredicate((w) => w is Scrollable && w.axisDirection == AxisDirection.down).first;
  for (var i = 0; i < 60 && finder.evaluate().isEmpty; i++) {
    await tester.drag(scrollable, const Offset(0, -300));
    await tester.pump();
  }
  await tester.ensureVisible(finder.first);
  await tester.pumpAndSettle();
}

Future<void> tapText(WidgetTester tester, String text) async {
  await scrollTo(tester, find.text(text));
  await tester.tap(find.text(text).first);
  await tester.pumpAndSettle();
}
