import 'package:flutter/material.dart';

import 'config/app_config.dart';
import 'state/app_state.dart';
import 'theme/theme.dart';
import 'ui/shell.dart';

class PunePediaApp extends StatelessWidget {
  const PunePediaApp({super.key, required this.state});
  final AppState state;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      state: state,
      child: ListenableBuilder(
        listenable: state,
        builder: (context, _) => MaterialApp(
          title: AppConfig.appName,
          debugShowCheckedModeBanner: false,
          theme: buildTheme(Brightness.light),
          darkTheme: buildTheme(Brightness.dark),
          themeMode: state.themeMode,
          // Reader's text-size choice multiplies the system font scale, so
          // accessibility settings on the phone are respected and extended.
          builder: (context, child) {
            final mq = MediaQuery.of(context);
            final system = mq.textScaler.scale(1.0);
            return MediaQuery(
              data: mq.copyWith(textScaler: TextScaler.linear((system * state.textScale).clamp(0.8, 3.0))),
              child: child!,
            );
          },
          home: const RootShell(),
        ),
      ),
    );
  }
}
