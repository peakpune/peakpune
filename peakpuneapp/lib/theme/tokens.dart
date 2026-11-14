import 'package:flutter/widgets.dart';

/// Brand tokens, copied from public/tokens.css. Change them there first.
abstract final class PP {
  // Brand kit v1.
  static const ink = Color(0xFF1C1410); // Chai Ink: text, rules, outlines
  static const paper = Color(0xFFF6EFE2); // Peth Paper: ground
  static const brick = Color(0xFFB8381F); // Wada Brick: current tab, eyebrows, links
  static const haldi = Color(0xFFE8A317); // fills only, never small text on paper
  static const sage = Color(0xFFC9D6B5); // Mutha Sage
  static const clay = Color(0xFFD9B99B); // Misal Clay
  static const white = Color(0xFFFFFFFF);

  // Supporting values defined in tokens.css (not kit colours).
  static const inkSoft = Color(0xFF50453E); // --ink-soft: small note text
  static const rule = Color(0x261C1410); // --rule: Ink at 15 %
  static const brickDark = Color(0xFF98290F); // --brick-dark

  /// Category blocks cycle these flat fills; see [onFill] for the text colour.
  static const blockCycle = [brick, haldi, sage, clay];

  /// Text on Brick is white; on Haldi, Sage, Clay, Paper and white it is Ink.
  static Color onFill(Color fill) => fill == brick || fill == ink || fill == brickDark ? white : ink;

  // 4 px spacing grid.
  static const s1 = 4.0, s2 = 8.0, s3 = 12.0, s4 = 16.0, s5 = 20.0, s6 = 24.0, s8 = 32.0, s10 = 40.0, s12 = 48.0;

  // Radii.
  static const rInput = 10.0, rCard = 14.0, rPill = 999.0;

  // Outlines and hard shadows.
  static const outline = 4.0; // cards, dialogs, call to action
  static const chipBorder = 2.0; // buttons and chips
  static const lift = 6.0; // --lift: 6px 6px 0 ink
  static const signShadow = 8.0; // the Haldi signboard

  /// Minimum touch target.
  static const tap = 48.0;

  // Motion: 200-300 ms.
  static const fast = Duration(milliseconds: 200);
  static const medium = Duration(milliseconds: 250);
  static const slow = Duration(milliseconds: 300);

  static const siteUrl = 'https://peakpune.com';
  static const repoUrl = 'https://github.com/peakpune/peakpune';
}
