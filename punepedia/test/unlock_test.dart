import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:punepedia/purchase/unlock_controller.dart';
import 'package:punepedia/purchase/unlock_store.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  Future<UnlockController> controller(FakeUnlockStore? store, {Map<String, Object> prefs = const {}}) async {
    SharedPreferences.setMockInitialValues(prefs);
    final c = UnlockController(prefs: await SharedPreferences.getInstance(), store: store);
    await c.start();
    return c;
  }

  test('free samples are readable before the unlock, other entries are not', () async {
    final state = await makeState(store: FakeUnlockStore());
    final free = state.library.entries.where((e) => e.freeSample).toList();
    final locked = state.library.entries.firstWhere((e) => !e.freeSample && !e.isFixture);
    expect(free, isNotEmpty);
    expect(free.every(state.canRead), isTrue);
    expect(state.canRead(locked), isFalse);
  });

  test('a completed purchase unlocks and is remembered on the device', () async {
    final store = FakeUnlockStore();
    final c = await controller(store);
    expect(c.price, '₹199.00');
    await c.buy();
    await Future<void>.delayed(Duration.zero);
    expect(c.unlocked, isTrue);
    final prefs = await SharedPreferences.getInstance();
    expect(prefs.getBool('unlocked'), isTrue);
    expect(UnlockController(prefs: prefs).unlocked, isTrue);
  });

  test('a pending payment waits, then unlocks when Play confirms it', () async {
    final store = FakeUnlockStore(buyResult: UnlockEventKind.pending);
    final c = await controller(store);
    await c.buy();
    await Future<void>.delayed(Duration.zero);
    expect(c.unlocked, isFalse);
    expect(c.phase, UnlockPhase.pending);
    expect(c.messageKey, 'unlockPending');
    store.emit(UnlockEventKind.granted);
    await Future<void>.delayed(Duration.zero);
    expect(c.unlocked, isTrue);
  });

  test('a failed or cancelled purchase leaves the library locked', () async {
    final failing = await controller(FakeUnlockStore(buyResult: UnlockEventKind.failed));
    await failing.buy();
    await Future<void>.delayed(Duration.zero);
    expect(failing.unlocked, isFalse);
    expect(failing.messageKey, 'unlockFailed');

    final cancelled = await controller(FakeUnlockStore(buyResult: UnlockEventKind.canceled));
    await cancelled.buy();
    await Future<void>.delayed(Duration.zero);
    expect(cancelled.unlocked, isFalse);
    expect(cancelled.messageKey, isNull);
    expect(cancelled.phase, UnlockPhase.ready);
  });

  test('an earlier purchase is restored quietly at start', () async {
    final c = await controller(FakeUnlockStore(ownsUnlock: true));
    await Future<void>.delayed(Duration.zero);
    expect(c.unlocked, isTrue);
  });

  test('a store error during the quiet restore at start is ignored', () async {
    final c = await controller(FakeUnlockStore(restoreThrows: true));
    expect(c.phase, UnlockPhase.ready);
    expect(c.unlocked, isFalse);
  });

  test('no store means the unlock is unavailable', () async {
    final c = await controller(null);
    expect(c.phase, UnlockPhase.unavailable);
    await c.buy();
    expect(c.unlocked, isFalse);
  });

  testWidgets('a locked entry offers the unlock instead of the story', (tester) async {
    await pumpApp(tester);
    await openEntryById(tester, 'vishrambaug-wada');
    expect(find.text('Vishrambaug Wada'), findsOneWidget);
    expect(find.text('Read the full story'), findsOneWidget);
    expect(find.text('Unlock for ₹199.00'), findsOneWidget);
    expect(find.text('Story'), findsNothing);
    expect(find.text('Sources'), findsNothing);
  });

  testWidgets('buying the unlock opens the story straight away', (tester) async {
    final store = FakeUnlockStore();
    final state = await pumpApp(tester, store: store);
    await openEntryById(tester, 'vishrambaug-wada');
    await tester.ensureVisible(find.text('Unlock for ₹199.00'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Unlock for ₹199.00'));
    await tester.pumpAndSettle();
    expect(store.buys, 1);
    expect(state.unlock.unlocked, isTrue);
    expect(find.text('Read the full story'), findsNothing);
    await tester.drag(verticalScrollable.first, const Offset(0, 3000));
    await tester.pumpAndSettle();
    await scrollToFirst(tester, find.text('Story'));
    expect(find.text('Story'), findsOneWidget);
  });

  testWidgets('restore with no earlier purchase says so', (tester) async {
    await pumpApp(tester);
    await openEntryById(tester, 'vishrambaug-wada');
    await tester.ensureVisible(find.text('Restore purchase'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Restore purchase'));
    await tester.pump();
    expect(find.text('Contacting Google Play…'), findsOneWidget);
    await tester.pump(const Duration(seconds: 11));
    expect(find.text('No earlier purchase found for the Google account on this phone.'), findsOneWidget);
  });

  testWidgets('without Google Play the unlock says it is unavailable', (tester) async {
    await pumpApp(tester, noStore: true);
    await openEntryById(tester, 'vishrambaug-wada');
    expect(find.textContaining("Purchases aren't available"), findsOneWidget);
    final button = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(button.onPressed, isNull);
  });

  testWidgets('Settings shows the unlock and the price', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.byTooltip('Settings').first);
    await tester.pumpAndSettle();
    expect(find.text('Full library'), findsOneWidget);
    expect(find.text('Unlock for ₹199.00'), findsOneWidget);
  });
}
