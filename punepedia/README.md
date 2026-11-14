# PunePedia

An expanding, sourced encyclopaedia of Pune for Android, in English — places, peths, wadas, people, festivals, food, local words and the changing city, from the earliest documented records to today.

- **Publisher:** OverTime Labs
- **Price:** free download with a one-time ₹199 in-app unlock of the full library (see `docs/PURCHASE_MODEL.md`)
- **Status:** v0.1 working app with a small, genuinely sourced starter library. Not published. Entries were drafted with AI assistance from their cited sources and signed off by the publisher on 2026-10-31.
- **Name:** “PunePedia” is a working name. It has **not** been cleared as a trademark.

> **Build status.** Built on 2026-10-31 with Flutter 3.47.9 (Dart 3.13.7): `flutter analyze` is clean, all 35 tests pass, and release APKs and an app bundle compile. The app has **not yet been run on a physical phone** — do the manual checklist in `docs/TEST_CHECKLIST.md` on a device before any release candidate.

---

## What's in the box

| Path | What it is |
|---|---|
| `lib/` | Flutter app (Dart). Screens never contain content; they read the compiled library. Purchase code is in `lib/purchase/`. |
| `content/entries/*.json` | The encyclopaedia, as structured records (one array per file). |
| `content/sources.json` | Source register: bibliographic details, links, and an editorial evaluation of each source. |
| `content/taxonomy.json` | Eras, categories and collections. |
| `content/fixtures/dev_fixtures.json` | Invented **test** records. Never shipped (see below). |
| `tools/content.py` | Validator, builder, release gate and register generator (Python 3, standard library only). |
| `assets/content/library.json` | Compiled library bundled into the app. Generated — don't edit. |
| `assets/fonts/` | Tiro Devanagari Marathi (headings) and Mukta (body), both SIL OFL. Licences included. |
| `docs/` | Content guide, source register, test checklist, release notes, purchase model notes. |
| `store/` | Play Store icon (512 px), feature graphic (1024×500) and phone screenshots. |
| `test/` | Unit and widget tests. |

## Sections

1. **Discover** — search, a featured city story, collections, topic grid, library status.
2. **Timeline** — five eras, chronological within each. Research leads hidden unless switched on.
3. **Explore** — places, neighbourhoods & peths, people, food, festivals, local words, institutions, events. Empty topics say they're empty.
4. **Saved** — bookmarks and offline-library status.

Places with checked coordinates have an **Open in Google Maps** button. There is no in-app map: the free map provider (OpenFreeMap) could not be verified working in this build (see `docs/RELEASE.md`).

Each entry shows: title, era/date, status (source-checked / disputed / research lead), summary, the story split into **Documented / Tradition / Disputed / Context / Editor's note**, numbered citations that open a source viewer, image credits (none yet), location with its provenance, the source list with pages, related entries, and when it was last reviewed.

## Requirements

- Flutter **3.22 or newer** (Dart 3.4+), Android SDK with platform 34+, Java 17
- Python 3.9+ (for the content tool)

## First build

```bash
# 1. Generate the standard Android scaffolding (Gradle wrapper, MainActivity,
#    launcher icons). Existing files — lib/, test/, the custom
#    AndroidManifest.xml, pubspec.yaml — are kept.
./tools/bootstrap_android.sh

# 2. Static checks
flutter analyze

# 3. Tests
flutter test

# 4. Run on a device/emulator
flutter run
```

If `flutter analyze` reports errors after a Flutter upgrade, they will most likely be API drift between Flutter or package versions.

### Development fixtures

To exercise empty-state and image-credit layouts with invented test records:

```bash
python3 tools/content.py build --fixtures
flutter run --dart-define=PUNEPEDIA_FIXTURES=true
```

Fixtures carry a red **DEVELOPMENT FIXTURE** banner. They load only in debug/profile builds *and* only with that flag. Run `python3 tools/content.py build` (without `--fixtures`) afterwards; the release gate and a unit test fail if fixtures remain in `assets/`.

### Build an APK

```bash
python3 tools/content.py build
flutter build apk --debug          # installable test build
flutter build appbundle --release  # needs signing — see docs/RELEASE.md
```

Production signing keys are **not** in this repository and must never be added. `docs/RELEASE.md` explains how to keep them outside the repo.

## Adding or revising content

See **[docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md)**. In short:

1. Add the source to `content/sources.json` (with an honest evaluation).
2. Add or edit the entry in `content/entries/*.json`; cite the source in each segment.
3. `python3 tools/content.py build` — validates and recompiles. No screen code changes.
4. `python3 tools/content.py register` — refreshes `docs/SOURCE_REGISTER.md`.

## Before publishing

`python3 tools/content.py release-check` must pass (it does as of 2026-10-31: every entry signed off, every location verified, purchase model set, at least one free sample).

Also: create the in-app product in Play Console (`docs/PURCHASE_MODEL.md`), run the manual checklist in **[docs/TEST_CHECKLIST.md](docs/TEST_CHECKLIST.md)**, clear the app name, add an app icon, a privacy contact and a Play Store privacy policy URL. Nothing has been published, deployed or purchased.

## Privacy

No accounts, ads, analytics or tracking SDKs. Bookmarks and settings stay on the device. The app's own code makes no network requests: source links and Google Maps open in other apps when the reader chooses. The Google Play Billing Library, which handles the unlock, adds the INTERNET and network-state permissions and its own Google data-transport component.
