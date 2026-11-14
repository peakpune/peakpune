import 'package:flutter/material.dart';

import '../data/models.dart';

/// PunePedia palette: charcoal and warm cream, with saffron used sparingly
/// for focus, links and the active tab. Contrast pairs were chosen to meet
/// WCAG AA for body text in both modes.
class PPColors extends ThemeExtension<PPColors> {
  const PPColors({
    required this.ink,
    required this.inkMuted,
    required this.paper,
    required this.paperRaised,
    required this.rule,
    required this.saffron,
    required this.verified,
    required this.disputed,
    required this.lead,
    required this.tradition,
  });

  final Color ink;
  final Color inkMuted;
  final Color paper;
  final Color paperRaised;
  final Color rule;
  final Color saffron;
  final Color verified;
  final Color disputed;
  final Color lead;
  final Color tradition;

  static const dark = PPColors(
    ink: Color(0xFFF2E8D5), // warm cream
    inkMuted: Color(0xFFC2B7A6),
    paper: Color(0xFF1C1B19), // charcoal
    paperRaised: Color(0xFF26241F),
    rule: Color(0xFF3B3731),
    saffron: Color(0xFFE39A45),
    verified: Color(0xFF9DBB86),
    disputed: Color(0xFFE0B25A),
    lead: Color(0xFF9FB3C4),
    tradition: Color(0xFFD9A7C7),
  );

  static const light = PPColors(
    ink: Color(0xFF23201C),
    inkMuted: Color(0xFF5C5348),
    paper: Color(0xFFF7F1E5), // cream
    paperRaised: Color(0xFFFFFBF3),
    rule: Color(0xFFDDD2BF),
    saffron: Color(0xFF9E520C),
    verified: Color(0xFF3F6230),
    disputed: Color(0xFF7D5A0E),
    lead: Color(0xFF3F5A70),
    tradition: Color(0xFF7E3F67),
  );

  Color forStatus(EntryStatus s) => switch (s) {
        EntryStatus.verified => verified,
        EntryStatus.disputed => disputed,
        EntryStatus.researchLead => lead,
      };

  Color forKind(SegmentKind k) => switch (k) {
        SegmentKind.evidence => verified,
        SegmentKind.tradition => tradition,
        SegmentKind.disputed => disputed,
        SegmentKind.context => inkMuted,
        SegmentKind.note => lead,
      };

  static PPColors of(BuildContext context) =>
      Theme.of(context).extension<PPColors>()!;

  @override
  PPColors copyWith() => this;

  @override
  PPColors lerp(ThemeExtension<PPColors>? other, double t) =>
      (other is PPColors && t > 0.5) ? other : this;
}

const String kSerif = 'TiroDevanagariMarathi';
const String kSans = 'Mukta';

ThemeData buildTheme(Brightness brightness) {
  final c = brightness == Brightness.dark ? PPColors.dark : PPColors.light;
  final scheme = ColorScheme(
    brightness: brightness,
    primary: c.saffron,
    onPrimary: brightness == Brightness.dark ? const Color(0xFF1C1B19) : const Color(0xFFFFFBF3),
    secondary: c.inkMuted,
    onSecondary: c.paper,
    error: brightness == Brightness.dark ? const Color(0xFFF2A79B) : const Color(0xFF9B2C1F),
    onError: c.paper,
    surface: c.paper,
    onSurface: c.ink,
    surfaceContainerHighest: c.paperRaised,
    outline: c.rule,
  );

  TextStyle serif(double size, {FontWeight w = FontWeight.w400, double h = 1.2}) =>
      TextStyle(fontFamily: kSerif, fontSize: size, fontWeight: w, height: h, color: c.ink);
  TextStyle sans(double size, {FontWeight w = FontWeight.w400, double h = 1.5, Color? color}) =>
      TextStyle(fontFamily: kSans, fontSize: size, fontWeight: w, height: h, color: color ?? c.ink);

  final text = TextTheme(
    displaySmall: serif(34, h: 1.15),
    headlineMedium: serif(28, h: 1.2),
    headlineSmall: serif(24, h: 1.25),
    titleLarge: serif(21, h: 1.3),
    titleMedium: sans(17, w: FontWeight.w600, h: 1.35),
    titleSmall: sans(15, w: FontWeight.w600, h: 1.35),
    bodyLarge: sans(17.5, h: 1.6),
    bodyMedium: sans(16, h: 1.55),
    bodySmall: sans(14, h: 1.45, color: c.inkMuted),
    labelLarge: sans(15, w: FontWeight.w600, h: 1.2),
    labelMedium: sans(13.5, w: FontWeight.w500, h: 1.2),
    labelSmall: sans(12.5, w: FontWeight.w500, h: 1.2, color: c.inkMuted),
  );

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: c.paper,
    canvasColor: c.paper,
    fontFamily: kSans,
    textTheme: text,
    extensions: [c],
    dividerTheme: DividerThemeData(color: c.rule, thickness: 1, space: 1),
    appBarTheme: AppBarTheme(
      backgroundColor: c.paper,
      foregroundColor: c.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: serif(22),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: c.paperRaised,
      surfaceTintColor: Colors.transparent,
      indicatorColor: c.saffron.withAlpha(46),
      height: 68,
      labelTextStyle: WidgetStateProperty.resolveWith((states) => sans(
            12.5,
            w: states.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
            h: 1.1,
            color: states.contains(WidgetState.selected) ? c.ink : c.inkMuted,
          )),
      iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(
            color: states.contains(WidgetState.selected) ? c.saffron : c.inkMuted,
          )),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: c.paper,
      selectedColor: c.saffron.withAlpha(40),
      side: BorderSide(color: c.rule),
      labelStyle: sans(14, w: FontWeight.w500, h: 1.2),
      shape: const StadiumBorder(),
      showCheckmark: false,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.paperRaised,
      hintStyle: sans(16, color: c.inkMuted),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c.rule),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c.rule),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c.saffron, width: 2),
      ),
    ),
    listTileTheme: ListTileThemeData(
      iconColor: c.inkMuted,
      textColor: c.ink,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.ink,
      contentTextStyle: sans(15, color: c.paper),
      behavior: SnackBarBehavior.floating,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.paperRaised,
      surfaceTintColor: Colors.transparent,
      showDragHandle: true,
    ),
    sliderTheme: SliderThemeData(
      activeTrackColor: c.saffron,
      thumbColor: c.saffron,
      inactiveTrackColor: c.rule,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? c.saffron : c.inkMuted),
      trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? c.saffron.withAlpha(90) : c.rule),
    ),
    focusColor: c.saffron.withAlpha(60),
  );
}
