import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/library.dart';

enum HistoryLang { en, mr }

/// App-wide state. Everything stays on the device: two small preferences and
/// the bundled library. Nothing is sent anywhere.
class AppState extends ChangeNotifier {
  AppState({required this.library, required SharedPreferences prefs, DateTime Function()? clock, String? systemLanguage})
      : _prefs = prefs,
        now = clock ?? DateTime.now {
    _welcomeSeen = prefs.getBool(_kWelcome) ?? false;
    final saved = prefs.getString(_kLang);
    final system = systemLanguage ?? PlatformDispatcher.instance.locale.languageCode;
    _historyLang = switch (saved) {
      'mr' => HistoryLang.mr,
      'en' => HistoryLang.en,
      _ => system == 'mr' ? HistoryLang.mr : HistoryLang.en, // defaults to the system locale
    };
  }

  static const _kWelcome = 'welcome_seen';
  static const _kLang = 'history_lang';

  final Library library;
  final SharedPreferences _prefs;

  /// The clock. Tests pass a fixed time; expiry and freshness read it.
  final DateTime Function() now;

  late bool _welcomeSeen;
  late HistoryLang _historyLang;
  int _tab = 0;

  bool get welcomeSeen => _welcomeSeen;
  HistoryLang get historyLang => _historyLang;

  /// Selected bottom-navigation tab.
  int get tab => _tab;

  void finishWelcome() {
    _welcomeSeen = true;
    _prefs.setBool(_kWelcome, true);
    notifyListeners();
  }

  void setHistoryLang(HistoryLang lang) {
    _historyLang = lang;
    _prefs.setString(_kLang, lang.name);
    notifyListeners();
  }

  void goTab(int index) {
    if (index == _tab) return;
    _tab = index;
    notifyListeners();
  }
}

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child}) : super(notifier: state);

  static AppState of(BuildContext context) => context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;
  static AppState read(BuildContext context) => context.getInheritedWidgetOfExactType<AppScope>()!.notifier!;
}
