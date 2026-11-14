import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'data/library.dart';
import 'features/about.dart';
import 'features/home.dart';
import 'state/app_state.dart';
import 'theme/theme.dart';
import 'theme/tokens.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  LicenseRegistry.addLicense(() async* {
    yield LicenseEntryWithLineBreaks(['Fraunces font'], await rootBundle.loadString('assets/fonts/fraunces-OFL.txt'));
    yield LicenseEntryWithLineBreaks(['Inter font'], await rootBundle.loadString('assets/fonts/inter-OFL.txt'));
  });
  runApp(const _Boot());
}

/// Loads the bundled data, then starts the app. Everything is local, so this is quick.
class _Boot extends StatefulWidget {
  const _Boot();

  @override
  State<_Boot> createState() => _BootState();
}

class _BootState extends State<_Boot> {
  late Future<AppState> _load = _start();

  Future<AppState> _start() async {
    final prefs = await SharedPreferences.getInstance();
    final library = await Library.load(rootBundle);
    return AppState(library: library, prefs: prefs);
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<AppState>(
        future: _load,
        builder: (context, snap) {
          if (snap.hasData) return PeakPuneApp(state: snap.data!);
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: buildTheme(),
            home: snap.hasError
                ? LoadFailure(onRetry: () => setState(() => _load = _start()))
                : const Scaffold(
                    body: Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        PeakMark(size: 56),
                        SizedBox(height: PP.s5),
                        SizedBox(width: 120, child: LinearProgressIndicator(backgroundColor: PP.clay)),
                      ]),
                    ),
                  ),
          );
        },
      );
}
