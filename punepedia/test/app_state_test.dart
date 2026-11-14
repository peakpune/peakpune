import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:punepedia/config/app_config.dart';
import 'package:punepedia/state/app_state.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('bookmarks persist across restarts', () async {
    final a = await makeState();
    a.toggleBookmark('shaniwar-wada');
    a.toggleBookmark('ev-1932-poona-pact');
    expect(a.bookmarks, ['ev-1932-poona-pact', 'shaniwar-wada']);

    final prefs = await SharedPreferences.getInstance();
    final b = AppState(library: a.library, prefs: prefs);
    expect(b.bookmarks, ['ev-1932-poona-pact', 'shaniwar-wada']);

    b.toggleBookmark('shaniwar-wada');
    expect(b.isBookmarked('shaniwar-wada'), isFalse);
  });

  test('bookmarks to entries that no longer exist are dropped', () async {
    final s = await makeState(prefs: {'bookmarks': ['shaniwar-wada', 'removed-entry']});
    expect(s.bookmarks, ['shaniwar-wada']);
  });

  test('theme and text size persist', () async {
    final a = await makeState();
    a.setThemeMode(ThemeMode.dark);
    a.setTextScale(1.4);
    final prefs = await SharedPreferences.getInstance();
    final b = AppState(library: a.library, prefs: prefs);
    expect(b.themeMode, ThemeMode.dark);
    expect(b.textScale, closeTo(1.4, 0.001));
  });

  test('text size is clamped', () async {
    final a = await makeState();
    a.setTextScale(5);
    expect(a.textScale, AppState.maxScale);
    a.setTextScale(0.1);
    expect(a.textScale, AppState.minScale);
  });

  test('the version shown in About matches pubspec.yaml', () {
    final line = File('pubspec.yaml').readAsLinesSync().firstWhere((l) => l.startsWith('version:'));
    expect(line.split(':')[1].trim().split('+').first, AppConfig.appVersion);
  });

  test('a real privacy contact is set before publication', () {
    expect(AppConfig.privacyContact, contains('@'));
  });
}
