import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/models.dart';
import '../data/search.dart';
import '../purchase/unlock_controller.dart';
import '../purchase/unlock_store.dart';

/// App-wide state: the loaded library, reader settings and bookmarks.
/// Everything is stored on the device only (SharedPreferences); nothing is
/// sent anywhere.
class AppState extends ChangeNotifier {
  AppState({required this.library, required SharedPreferences prefs, UnlockStore? store})
      : _prefs = prefs,
        search = SearchIndex(library),
        unlock = UnlockController(prefs: prefs, store: store) {
    unlock.addListener(notifyListeners);
    _themeMode = switch (prefs.getString(_kTheme)) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    _textScale = (prefs.getDouble(_kScale) ?? 1.0).clamp(minScale, maxScale);
    _bookmarks = [
      for (final id in prefs.getStringList(_kBookmarks) ?? const <String>[])
        if (library.entry(id) != null) id,
    ];
    _showResearchLeads = prefs.getBool(_kLeads) ?? false;
  }

  static const _kTheme = 'theme';
  static const _kScale = 'textScale';
  static const _kBookmarks = 'bookmarks';
  static const _kLeads = 'showResearchLeads';
  static const double minScale = 0.85;
  static const double maxScale = 1.6;

  final Library library;
  final SearchIndex search;

  /// The one-time purchase that opens the full library.
  final UnlockController unlock;
  final SharedPreferences _prefs;

  late ThemeMode _themeMode;
  late double _textScale;
  late List<String> _bookmarks;
  late bool _showResearchLeads;

  ThemeMode get themeMode => _themeMode;
  double get textScale => _textScale;
  List<String> get bookmarks => List.unmodifiable(_bookmarks);
  bool get showResearchLeads => _showResearchLeads;

  void setThemeMode(ThemeMode mode) {
    _themeMode = mode;
    _prefs.setString(_kTheme, switch (mode) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    });
    notifyListeners();
  }

  void setTextScale(double scale) {
    _textScale = scale.clamp(minScale, maxScale);
    _prefs.setDouble(_kScale, _textScale);
    notifyListeners();
  }

  void setShowResearchLeads(bool value) {
    _showResearchLeads = value;
    _prefs.setBool(_kLeads, value);
    notifyListeners();
  }

  /// Free sample entries are open to everyone; the rest need the unlock.
  bool canRead(Entry e) => unlock.unlocked || e.freeSample || e.isFixture;

  bool isBookmarked(String id) => _bookmarks.contains(id);

  void toggleBookmark(String id) {
    if (_bookmarks.contains(id)) {
      _bookmarks.remove(id);
    } else {
      _bookmarks.insert(0, id);
    }
    _prefs.setStringList(_kBookmarks, _bookmarks);
    notifyListeners();
  }

  @override
  void dispose() {
    unlock.removeListener(notifyListeners);
    unlock.dispose();
    super.dispose();
  }
}

/// Makes [AppState] available below it and rebuilds dependents on change.
class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
      : super(notifier: state);

  static AppState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope missing above this widget');
    return scope!.notifier!;
  }

  /// Read without subscribing to changes (for callbacks).
  static AppState read(BuildContext context) {
    final scope = context.getInheritedWidgetOfExactType<AppScope>();
    return scope!.notifier!;
  }
}
