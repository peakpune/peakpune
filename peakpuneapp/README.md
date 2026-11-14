# Peak Pune for Android

The phone companion to [peakpune.com](https://peakpune.com). It covers places, loops and treks, events,
meetups, history, shopping and an offline Pune Metro planner. It uses the same data and the same honesty
rules as the website.

- **Publisher:** OverTime Labs
- **Package:** `com.overtimelabs.peakpuneapp`. This app is separate from PunePedia and shares no
  package, keys or listing with it.
- **Price:** free. There are no ads, no in-app purchases and no paywall.
- **Privacy:** no accounts, analytics, tracking or server. The app has **no INTERNET permission**.
  Links, maps, sharing and calendar entries hand off to other apps only when the user taps them.

This folder sits inside the website repository but does not affect the site. The site's CI runs
`node --test` on the JavaScript only, and nothing here is deployed.

## Stack

Native Kotlin with Jetpack Compose and Material 3 (Compose BOM 2026.09), using navigation-compose and
kotlinx-serialization. The build uses AGP 9.5 with built-in Kotlin and Gradle 9.9. Android support:

- compileSdk 37
- targetSdk 36
- minSdk 26, which variable fonts need

The release APK is about 2.4 MB.

## Build it yourself

You need JDK 17 or newer and the Android SDK, with platform 37 installed.

```bash
cd peakpuneapp
```

```bash
./gradlew :app:testDebugUnitTest
```

```bash
./gradlew :app:assembleRelease
```

The APK lands in `app/build/outputs/apk/release/`. By default the release build is signed with the
**debug key**, so you can install it to test. For Google Play, create your own upload key, add it as a
`signingConfig` in `app/build.gradle.kts`, and build an App Bundle with `./gradlew :app:bundleRelease`.
`*.jks` and `key.properties` are git-ignored. Never commit them.

The package name lives in one place: `applicationId` in `app/build.gradle.kts`.

## Data: one source of truth

The app reads the repository's own `data/` folder. The Gradle task `syncPeakData` copies these files into
the APK's assets at build time, so the app can never drift from the website:

| In the app          | From the repository                       |
|---------------------|-------------------------------------------|
| places.json         | data/batch-1-places/places.json           |
| outdoors.json       | data/batch-2-outdoors/outdoors.json       |
| events.json         | data/batch-3-events/events.json           |
| meetups.json        | data/batch-4-meetups/meetups.json         |
| publication-audit   | data/publication-audit.json               |
| metro.json, areas   | data/metro/metro.json, data/metro/areas.json |
| history.json        | data/history.json (optional)              |
| shopping.json       | data/shopping.json (optional)             |

The app shows only the records the publication audit marks "publish", with the audit's overrides applied.
To update the app's content, edit `data/` and rebuild. The JVM tests read the same files.

### History and shopping files (not in the repository yet)

Until these files exist, the History and Shopping screens say plainly that the content is still being
checked. Rows **without sources are dropped**. Expected shapes:

```json
[{"id": "shaniwar-wada-1732", "era": "Peshwa era", "year": 1732, "date_label": "1730–1732",
  "title_en": "…", "title_mr": "…", "summary_en": "…", "summary_mr": "…",
  "sources": [{"label": "Gazetteer", "url": "https://…"}], "checked_at": "2026-11-14"}]
```

```json
{"areas": [{"id": "tulshibaug", "name": "Tulshibaug", "area": "Budhwar Peth", "known_for": ["utensils"],
            "best_for": "…", "sources": ["https://…"], "checked_at": "2026-11-14"}],
 "shops": [{"id": "…", "name": "…", "area": "…", "since": 1890, "note": "…",
            "known_for": ["…"], "sources": ["https://…"], "checked_at": "2026-11-14"}]}
```

Put `since` only where one of the shop's listed sources states the founding year. The app shows the sources right under it.

## Honesty rules, enforced in code and tests

- Every entry shows its checked date. Entries checked more than 90 days ago are flagged for a re-check.
- An unknown price reads "Price not confirmed". It never reads "Free".
- Dated events hide once they expire. Recurring listings stay.
- Line 3 metro stations are labelled as media-reported. Disputed fare pairs show "Check the official fare
  chart" instead of a number. A trip that crosses operators shows each ticket separately.
- Every history and shopping entry lists its sources.

## Tests

There are 38 tests in total, run with `./gradlew :app:testDebugUnitTest`:

- **Data and honesty, 11 tests:** counts, audit overrides, the price rule, the 90-day rule, expiry, the
  weekend window, calendar slots, date formats, and history and shopping parsing.
- **Metro, 15 tests:** the validator catches seeded mistakes, station identities, Line 3 status, disputed
  pairs, exact fares, routes, and a check that every selectable pair has a route.
- **UI (Compose on Robolectric), 12 tests:**
  - welcome once;
  - weekend events on Home;
  - tab switching;
  - "Price not confirmed" and the checked date on a place;
  - the 90-day flag;
  - expired events hidden;
  - a metro route with a ₹30 fare;
  - the History EN/MR toggle, its sources and the system-locale default;
  - the shopping empty state;
  - About;
  - every Home tile at 130% font scale.

If your machine has to reach Maven Central through a mirror, set
`robolectricRepoUrl=<mirror>` in `~/.gradle/gradle.properties`.

**Screenshots:** this command renders Android screenshots of the real UI, using Robolectric's native
graphics.

```bash
./gradlew :app:testDebugUnitTest --tests '*Screenshots*' -PscreenshotsDir=$PWD/store/screenshots
```

## Tradeoffs and TODOs

- **No live data in v1.** The content is the snapshot bundled at build time, and About states the audit
  date. A future version could fetch updates from peakpune.com. That needs the INTERNET permission and a
  privacy note, so it stays out of v1.
- **Donations, later.** Nothing blocks them. An external donate link in About would need no permission
  and no SDK.
- **Docs inconsistency, outside this folder.** `data/metro/README.md` says the planner will not offer a
  Line 3 station until it is verified. The website's Gleam planner, and this port of it, do offer
  media-reported Line 3 stations, labelled "reported open by the media". This matches the root README.
  One of the two documents should change. The app follows the planner code.
- **Fonts:** Fraunces and Inter are bundled under the SIL Open Font Licence. The licence texts are in
  `app/src/main/assets/licences/`.
