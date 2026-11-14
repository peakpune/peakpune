# Peak Pune for Android

The phone companion to [peakpune.com](https://peakpune.com): the same brand, the same data and the same honesty rules, in a Flutter app that works fully offline from first launch.

- **Publisher:** OverTime Labs
- **Price:** free. No ads, no in-app purchases, no paywall.
- **Network:** none. The app reads only data bundled inside it. Links, maps, sharing and calendar entries open other apps.
- **Platforms:** Android first. The code avoids Android-only APIs where that is free, so an iOS build should need only signing and icons.

## Build

Requirements: Flutter stable (3.44 or newer), Android SDK 36, Java 17.

```bash
cd app
flutter pub get
flutter analyze
flutter test
flutter run                         # on a phone or emulator
flutter build apk --release         # installable test build (debug-signed unless you add a key)
flutter build appbundle --release   # for Google Play, after setting up signing
```

Signing keys never go in this repository. To sign release builds, add `android/key.properties` (already git-ignored) and a `release` signing config in `android/app/build.gradle.kts`, following Flutter's "Build and release an Android app" guide.

### Package name: decide before the first upload

`applicationId` is set in **one place**: `android/app/build.gradle.kts` (`defaultConfig`). Nothing else needs to change.

| Choice | Value | When |
|---|---|---|
| Separate app (current) | `com.overtimelabs.peakpune` | A new Play listing |
| Replace PunePedia | `com.overtimelabs.punepedia` | Only if this app takes over the PunePedia listing; keeps its testers and signing history, and must be signed with PunePedia's upload key |

The Kotlin namespace (`com.overtimelabs.peakpune`) is independent of the applicationId and can stay as it is either way.

## Data

All content ships as JSON in `assets/data/`, copied from the repository's `data/` folder:

```bash
./tool/sync_data.sh   # after editing anything under ../data
flutter test          # test/data_test.dart fails while the copies are stale
```

| Asset | From |
|---|---|
| `publication-audit.json` | `data/publication-audit.json` |
| `places.json`, `outdoors.json`, `events.json`, `meetups.json` | `data/batch-1` to `batch-4` |
| `metro.json`, `areas.json` | `data/metro/` |
| `history.json`, `shopping.json` | `data/` (copied when present; not supplied yet) |

The app applies the publication audit exactly as the site does (`public/lib/publication.js`). Only records marked `publish` appear, with the audit's overrides and the audit date as their checked date. Places marked unverified, withheld events and meetups, and all moments stay hidden.

### History and shopping

The screens are built against these schemas and show an honest "still being checked" state until the files exist:

```jsonc
// data/history.json
[ { "id": "", "era": "", "year": 1730, "date_label": "", "title_en": "", "title_mr": "",
    "summary_en": "", "summary_mr": "", "sources": [ { "label": "", "url": "https://..." } ], "checked_at": "YYYY-MM-DD" } ]

// data/shopping.json
{ "areas": [ { "id": "", "name": "", "area": "", "known_for": "", "best_for": "", "notes": null, "sources": [] } ],
  "shops": [ { "id": "", "name": "", "area": "", "known_for": "", "since": 1925, "note": null, "sources": [], "checked_at": "YYYY-MM-DD" } ] }
```

Sources may be `{label, url}` objects or plain URL strings. Rows without a source are dropped. A missing `title_mr` or `summary_mr` is shown in English with a note; nothing is machine-translated. `since` is shown only when present.

## Honesty rules in the app

- Every entry shows its checked date. Anything checked more than 90 days ago is flagged as needing a re-check, and so is any source the data marks as over 90 days old.
- An unknown price reads "Price not confirmed" (meetups: "Cost not confirmed"), never "Free".
- Dated events hide once `expires_at` passes. Recurring venue listings stay.
- Add to calendar follows `scripts/calendar.mjs`: an exact time only when the data has one, otherwise an all-day entry. No end time is guessed, and partial listings say so.
- Metro: disputed fare pairs show "check the official fare chart", never a number. Range Hill is listed but not open. Line 3 stations are selectable but labelled media-reported, and closed ones cannot be chosen. The Line 3 WhatsApp number is never invented.
- History and shopping entries ship only with sources.

## Metro planner

`lib/metro/` is a line-for-line Dart port of `metro/src/peakpune_metro/planner.gleam`, with the network model from `scripts/metro-model.mjs`. `test/metro_test.dart` ports the checks in `tests/metro.test.js`, including the validator's "catches the mistakes it exists for" cases. It adds routing and fare tests, since the Gleam planner has none.

One repository inconsistency, flagged rather than silently resolved: `data/metro/README.md` says the planner will not offer a Line 3 station until its status is verified, but `planner.gleam` makes media-reported open stations selectable with a warning. The app follows the code.

## Tests

```bash
flutter test
```

- `test/data_test.dart`: publication audit, overrides, data in sync with `../data`, price, freshness, expiry, weekend and calendar rules, history and shopping parsing.
- `test/metro_test.dart`: data validation and the planner.
- `test/screens_test.dart`: welcome, all tabs, detail pages, search, staleness flag, event expiry, calendar and join actions, metro planning, history language toggle, shopping, About, 130 % text and Android touch-target and label guidelines.

## Later, not built

- **Live data from peakpune.com.** It would need the INTERNET permission, a fetch-and-cache layer, and new Play Data safety answers (network requests to peakpune.com). Until then, new listings arrive with app updates.
- **Donations button.** Not built. A "Support" entry would sit in About and open an external page; nothing in the app blocks it.
- **Moments and submissions.** All moments are withheld by the publication audit, and submissions need moderation (a server). Not in this app.

## Licences

Code and content: MIT (see `../LICENSE`). Fonts: Fraunces and Inter, SIL Open Font License (`assets/fonts/*-OFL.txt`). Map coordinates: © OpenStreetMap contributors, ODbL.
