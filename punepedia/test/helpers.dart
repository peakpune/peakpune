import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:punepedia/app.dart';
import 'package:punepedia/data/models.dart';
import 'package:punepedia/purchase/unlock_store.dart';
import 'package:punepedia/state/app_state.dart';
import 'package:punepedia/ui/widgets/common.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Reads the real bundled library from disk (run `python3 tools/content.py
/// build` first). Tests run from the project root.
Library loadRealLibrary() {
  final raw = File('assets/content/library.json').readAsStringSync();
  return Library.fromJson(jsonDecode(raw) as Map<String, dynamic>);
}

/// Stands in for Google Play. [buyResult] is what a purchase reports;
/// [ownsUnlock] makes a restore re-deliver an earlier purchase.
class FakeUnlockStore implements UnlockStore {
  FakeUnlockStore({this.available = true, this.price = '₹199.00', this.buyResult = UnlockEventKind.granted, this.ownsUnlock = false, this.restoreThrows = false});

  final bool available;
  final String? price;
  final UnlockEventKind? buyResult;
  final bool ownsUnlock;
  final bool restoreThrows;
  int buys = 0;
  final StreamController<UnlockEvent> _events = StreamController.broadcast();

  /// Lets a test deliver a store event directly (e.g. a pending payment completing).
  void emit(UnlockEventKind kind) => _events.add(UnlockEvent(kind));

  @override
  Stream<UnlockEvent> get events => _events.stream;
  @override
  Future<bool> isAvailable() async => available;
  @override
  Future<String?> loadPrice() async => price;
  @override
  Future<bool> buy() async {
    buys++;
    if (buyResult != null) scheduleMicrotask(() => emit(buyResult!));
    return true;
  }

  @override
  Future<void> restore() async {
    if (restoreThrows) throw StateError('billing service disconnected');
    if (ownsUnlock) scheduleMicrotask(() => emit(UnlockEventKind.granted));
  }

  @override
  void dispose() {}
}

Future<AppState> makeState({Map<String, Object> prefs = const {}, UnlockStore? store}) async {
  SharedPreferences.setMockInitialValues(prefs);
  final p = await SharedPreferences.getInstance();
  return AppState(library: loadRealLibrary(), prefs: p, store: store);
}

/// Starts the app on a phone-sized surface. [store] defaults to a fake Play
/// store that sells the unlock; pass `noStore: true` for a device without one.
Future<AppState> pumpApp(
  WidgetTester tester, {
  Map<String, Object> prefs = const {},
  UnlockStore? store,
  bool noStore = false,
}) async {
  // A phone-sized surface.
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 3.0;
  addTearDown(tester.view.reset);
  final state = await makeState(prefs: prefs, store: noStore ? null : (store ?? FakeUnlockStore()));
  await tester.pumpWidget(PunePediaApp(state: state));
  await state.unlock.start();
  await tester.pumpAndSettle();
  return state;
}

/// Opens an entry directly, as tapping it in any list would.
Future<void> openEntryById(WidgetTester tester, String id) async {
  openEntry(tester.element(find.byType(Scaffold).first), id);
  await tester.pumpAndSettle();
}

/// The vertically scrolling list on the current screen. Several screens also
/// hold horizontal strips (era chips, collections), so a bare
/// `find.byType(Scrollable)` matches more than one.
final Finder verticalScrollable = find.byWidgetPredicate(
  (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
);

/// Opens the featured story from Discover. The card can sit below the fold on
/// a phone-sized surface, so it is scrolled into view first.
Future<void> openFeaturedStory(WidgetTester tester) async {
  final link = find.text('Read the story');
  await tester.ensureVisible(link);
  await tester.pumpAndSettle();
  await tester.tap(link);
  await tester.pumpAndSettle();
}

/// Scrolls the current screen until [finder] matches, then brings its first
/// match into view. Unlike `scrollUntilVisible`, works when the target
/// appears more than once (a source cited in several paragraphs).
Future<void> scrollToFirst(WidgetTester tester, Finder finder, {Finder? within}) async {
  final scrollable = within == null
      ? verticalScrollable.first
      : find.descendant(of: within, matching: verticalScrollable).first;
  for (var i = 0; i < 50 && finder.evaluate().isEmpty; i++) {
    await tester.drag(scrollable, const Offset(0, -200));
    await tester.pump();
  }
  await tester.ensureVisible(finder.first);
  await tester.pumpAndSettle();
}
