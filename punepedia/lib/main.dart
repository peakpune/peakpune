import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'config/app_config.dart';
import 'data/library_repository.dart';
import 'purchase/unlock_store.dart';
import 'state/app_state.dart';
import 'theme/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Show the bundled fonts' licences on the Open-source licences page.
  LicenseRegistry.addLicense(() async* {
    yield LicenseEntryWithLineBreaks(
      ['Mukta font'],
      await rootBundle.loadString('assets/fonts/OFL-Mukta.txt'),
    );
    yield LicenseEntryWithLineBreaks(
      ['Tiro Devanagari Marathi font'],
      await rootBundle.loadString('assets/fonts/OFL-TiroDevanagariMarathi.txt'),
    );
  });
  runApp(const _Bootstrap());
}

/// Loads settings and the bundled library, then starts the app. Shows a
/// plain retry screen if the library asset cannot be read.
class _Bootstrap extends StatefulWidget {
  const _Bootstrap();

  @override
  State<_Bootstrap> createState() => _BootstrapState();
}

class _BootstrapState extends State<_Bootstrap> {
  late Future<AppState> _future = _load();

  Future<AppState> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final library = await LibraryRepository().load();
    // Google Play Billing exists only on Android; elsewhere the unlock shows
    // as unavailable.
    final store = !kIsWeb && defaultTargetPlatform == TargetPlatform.android
        ? PlayUnlockStore(productId: AppConfig.unlockProductId)
        : null;
    final state = AppState(library: library, prefs: prefs, store: store);
    unawaited(state.unlock.start());
    return state;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<AppState>(
      future: _future,
      builder: (context, snap) {
        if (snap.hasData) return PunePediaApp(state: snap.data!);
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: buildTheme(Brightness.light),
          darkTheme: buildTheme(Brightness.dark),
          home: Scaffold(
            body: Center(
              child: snap.hasError
                  ? Column(mainAxisSize: MainAxisSize.min, children: [
                      const Text('The library could not be loaded.', textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: () => setState(() => _future = _load()),
                        child: const Text('Try again'),
                      ),
                    ])
                  : const CircularProgressIndicator(),
            ),
          ),
        );
      },
    );
  }
}
