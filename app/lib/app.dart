import 'package:flutter/material.dart';

import 'features/about.dart';
import 'features/shell.dart';
import 'state/app_state.dart';
import 'theme/theme.dart';

class PeakPuneApp extends StatelessWidget {
  const PeakPuneApp({super.key, required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) => AppScope(
        state: state,
        child: MaterialApp(
          title: 'Peak Pune',
          debugShowCheckedModeBanner: false,
          theme: buildTheme(), // light theme only, by design
          themeMode: ThemeMode.light,
          home: ListenableBuilder(
            listenable: state,
            builder: (context, _) => AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: state.welcomeSeen ? const Shell() : WelcomeScreen(onDone: state.finishWelcome),
            ),
          ),
        ),
      );
}
