import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

import 'tokens.dart';

/// Fraunces and Inter ship as variable fonts; the weight axis is set explicitly so
/// the right instance is drawn on every platform.
TextStyle fraunces(double size, double weight, {double? height, Color color = PP.ink, double letterSpacing = 0}) => TextStyle(
      fontFamily: 'Fraunces',
      fontSize: size,
      height: height,
      color: color,
      letterSpacing: letterSpacing,
      fontWeight: _weight(weight),
      fontVariations: [FontVariation('wght', weight)],
    );

TextStyle inter(double size, double weight, {double? height, Color color = PP.ink, double letterSpacing = 0}) => TextStyle(
      fontFamily: 'Inter',
      fontSize: size,
      height: height,
      color: color,
      letterSpacing: letterSpacing,
      fontWeight: _weight(weight),
      fontVariations: [FontVariation('wght', weight)],
    );

FontWeight _weight(double w) => FontWeight.values[((w / 100).round() - 1).clamp(0, 8)];

/// Marathi text: the system Devanagari font (Inter has no Devanagari glyphs).
TextStyle marathi(TextStyle base) => base.copyWith(fontFamily: null, fontVariations: const [], fontFamilyFallback: const ['Noto Sans Devanagari', 'sans-serif']);

ThemeData buildTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.light,
    primary: PP.ink,
    onPrimary: PP.white,
    secondary: PP.brick,
    onSecondary: PP.white,
    tertiary: PP.haldi,
    onTertiary: PP.ink,
    error: PP.brickDark,
    onError: PP.white,
    surface: PP.paper,
    onSurface: PP.ink,
    surfaceContainerLowest: PP.white,
    surfaceContainerLow: PP.white,
    surfaceContainer: PP.paper,
    surfaceContainerHigh: PP.paper,
    surfaceContainerHighest: PP.clay,
    outline: PP.ink,
    outlineVariant: PP.rule,
  );
  final text = TextTheme(
    // Screen titles: Fraunces 800. Card titles: Fraunces 600. Everything else: Inter.
    displaySmall: fraunces(40, 800, height: 1.1, letterSpacing: -0.6),
    headlineMedium: fraunces(32, 800, height: 1.1, letterSpacing: -0.5),
    headlineSmall: fraunces(26, 800, height: 1.15),
    titleLarge: fraunces(23, 600, height: 29 / 23),
    titleMedium: fraunces(19, 600, height: 1.3),
    titleSmall: inter(15, 700, height: 1.35),
    bodyLarge: inter(17, 500, height: 26 / 17),
    bodyMedium: inter(16, 400, height: 24 / 16),
    bodySmall: inter(14, 400, height: 20 / 14, color: PP.inkSoft),
    labelLarge: inter(16, 700, height: 1.25),
    labelMedium: inter(14, 600, height: 20 / 14),
    labelSmall: inter(12, 800, height: 16 / 12, color: PP.brick, letterSpacing: 1.7),
  );
  final pill = RoundedRectangleBorder(borderRadius: BorderRadius.circular(PP.rPill));
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: PP.paper,
    textTheme: text,
    fontFamily: 'Inter',
    splashFactory: InkSparkle.splashFactory,
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    pageTransitionsTheme: const PageTransitionsTheme(builders: {
      TargetPlatform.android: SharedAxisPageTransitionsBuilder(transitionType: SharedAxisTransitionType.horizontal),
      TargetPlatform.iOS: SharedAxisPageTransitionsBuilder(transitionType: SharedAxisTransitionType.horizontal),
    }),
    appBarTheme: AppBarTheme(
      backgroundColor: PP.paper,
      foregroundColor: PP.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: fraunces(22, 800),
      shape: const Border(bottom: BorderSide(color: PP.ink, width: 2)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: PP.paper,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      height: 72,
      indicatorColor: PP.brick,
      indicatorShape: pill,
      labelTextStyle: WidgetStateProperty.resolveWith((s) => inter(12, s.contains(WidgetState.selected) ? 800 : 600)),
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(color: s.contains(WidgetState.selected) ? PP.white : PP.ink)),
      overlayColor: WidgetStateProperty.all(PP.clay.withValues(alpha: 0.5)),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: PP.ink,
        foregroundColor: PP.white,
        minimumSize: const Size(PP.tap, PP.tap),
        padding: const EdgeInsets.symmetric(horizontal: PP.s6),
        shape: pill,
        side: const BorderSide(color: PP.ink, width: PP.chipBorder),
        textStyle: inter(16, 700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        backgroundColor: PP.paper,
        foregroundColor: PP.ink,
        minimumSize: const Size(PP.tap, PP.tap),
        padding: const EdgeInsets.symmetric(horizontal: PP.s4),
        shape: pill,
        side: const BorderSide(color: PP.ink, width: PP.chipBorder),
        textStyle: inter(15, 700),
      ).copyWith(overlayColor: WidgetStateProperty.all(PP.haldi.withValues(alpha: 0.45))),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(foregroundColor: PP.brick, minimumSize: const Size(PP.tap, PP.tap), textStyle: inter(15, 600)),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: PP.paper,
      selectedColor: PP.ink,
      checkmarkColor: PP.white,
      labelStyle: inter(14, 600),
      secondaryLabelStyle: inter(14, 600, color: PP.white),
      side: const BorderSide(color: PP.ink, width: PP.chipBorder),
      shape: pill,
      padding: const EdgeInsets.symmetric(horizontal: PP.s2, vertical: PP.s1),
      showCheckmark: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: PP.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: PP.s4, vertical: PP.s3),
      hintStyle: inter(16, 400, color: PP.inkSoft),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(PP.rInput), borderSide: const BorderSide(color: PP.ink, width: 2)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(PP.rInput), borderSide: const BorderSide(color: PP.ink, width: 2)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(PP.rInput), borderSide: const BorderSide(color: PP.brick, width: 3)),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        backgroundColor: PP.paper,
        foregroundColor: PP.ink,
        selectedBackgroundColor: PP.ink,
        selectedForegroundColor: PP.white,
        side: const BorderSide(color: PP.ink, width: PP.chipBorder),
        minimumSize: const Size(PP.tap, PP.tap),
        textStyle: inter(14, 700),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: PP.white,
      unselectedLabelColor: PP.ink,
      labelStyle: inter(15, 700),
      unselectedLabelStyle: inter(15, 600),
      indicatorSize: TabBarIndicatorSize.tab,
      dividerColor: Colors.transparent,
      indicator: BoxDecoration(color: PP.brick, borderRadius: BorderRadius.circular(PP.rPill)),
      overlayColor: WidgetStateProperty.all(PP.clay.withValues(alpha: 0.5)),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: PP.ink,
      contentTextStyle: inter(15, 500, color: PP.white),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(PP.rInput)),
    ),
    dividerTheme: const DividerThemeData(color: PP.rule, thickness: 1, space: 1),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: PP.brick),
  );
}
