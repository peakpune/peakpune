/// Product configuration. Business decisions live here so they can change
/// without touching screens.
///
/// Nothing in this file turns on a paid service. Billing is not wired in;
/// see docs/PURCHASE_MODEL.md before changing [purchaseModel].
library;

enum PurchaseModel {
  /// Not decided yet. The About screen says so honestly.
  undecided,

  /// Paid download on Google Play. Price is set in Play Console, not in code.
  paidUpfront,

  /// Free download with a one-time in-app unlock. Requires adding the
  /// in_app_purchase plugin and a Play Console product — not implemented.
  freeWithUnlock,

  /// Free, no purchase.
  free,
}

class AppConfig {
  AppConfig._();

  static const String appName = 'PunePedia';

  /// Shown in Settings › About. Must match `version:` in pubspec.yaml (a test checks).
  static const String appVersion = '0.2.0';
  static const String publisher = 'OverTime Labs';
  static const String androidPackage = 'com.overtimelabs.punepedia';

  /// Working name only — see docs/TEST_CHECKLIST.md (name clearance).
  static const bool nameCleared = false;

  /// Price of the unlock, set on the product in Play Console. Shown in About
  /// only as a fallback; the purchase button shows the price Play reports.
  static const String plannedPriceInr = '₹199';
  static const PurchaseModel purchaseModel = PurchaseModel.freeWithUnlock;

  /// Product ID of the one-time unlock. Create a one-time (non-consumable)
  /// in-app product with exactly this ID in Play Console.
  static const String unlockProductId = 'punepedia_full_unlock';

  /// Development fixtures load only in debug/profile builds and only when the
  /// app is run with --dart-define=PUNEPEDIA_FIXTURES=true. Release builds
  /// never load them (see LibraryRepository).
  static const bool fixturesRequested =
      bool.fromEnvironment('PUNEPEDIA_FIXTURES', defaultValue: false);

  static const String privacyContact = 'hello@aakashkamdi.com';
}
