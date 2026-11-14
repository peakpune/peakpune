import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../config/app_config.dart';
import 'models.dart';

/// Loads the bundled library. All text ships inside the app, so reading works
/// with no network connection.
class LibraryRepository {
  LibraryRepository({AssetBundle? bundle}) : _bundle = bundle ?? rootBundle;

  final AssetBundle _bundle;

  static const libraryAsset = 'assets/content/library.json';
  static const fixturesAsset = 'assets/content/dev_fixtures.json';

  /// Fixtures are invented test records. They load only outside release mode
  /// and only when explicitly requested at build time.
  static bool get fixturesAllowed =>
      !kReleaseMode && AppConfig.fixturesRequested;

  Future<Library> load() async {
    final raw = await _bundle.loadString(libraryAsset);
    final json = jsonDecode(raw) as Map<String, dynamic>;
    var fixtures = const <dynamic>[];
    if (fixturesAllowed) {
      try {
        final fx = jsonDecode(await _bundle.loadString(fixturesAsset))
            as Map<String, dynamic>;
        fixtures = (fx['fixtures'] as List?) ?? const [];
      } catch (_) {
        fixtures = const [];
      }
    }
    return Library.fromJson(json, fixtures: fixtures);
  }
}
