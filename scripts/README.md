# scripts/

Build and check tooling. No script here runs on a schedule or in the background.

## Site build

| Script | Role |
| --- | --- |
| `build.mjs` | The content renderer: reads `data/` and `site/`, writes page HTML, sitemap, robots, manifest, `.ics` files and the metro guide. Used by Astro. |
| `prepare-astro.mjs` | Runs `build.mjs` into `.generated/` and hands the assets to Astro. |
| `publish-static.mjs` | Copies Astro's output into the committed `public/` and stabilises island ids. |
| `prepare-checks.mjs`, `verify-ci.mjs` | Wrap `npm test`: install, compile types, then type-check, rebuild and fail on `public/` drift. |
| `update-plans.mjs` | Manual, credential-free export of the reviewed plans snapshot. See [docs/PLANS.md](../docs/PLANS.md). |

## Calendar

| Script | Role |
| --- | --- |
| `calendar.mjs` | Google Calendar links and `.ics` files. Timed only when the source has an exact start; no end time is guessed. |

## Pune Metro

| Script | Role |
| --- | --- |
| `metro-model.mjs` | Builds one normalised network model from `data/metro/` and validates it. |
| `validate-metro.mjs` | `npm run metro:check`. Fails if the metro data is inconsistent. |
| `metro-gleam-data.mjs` | `npm run metro:data`. Generates the typed Gleam modules from the same JSON. |
| `metro-build.mjs` | `npm run metro:build`. Generates data, compiles Gleam, bundles `metro/dist/planner.js`. |
| `metro-guide.mjs` | Renders the `/PuneMetroguide/` page and its service worker. |
| `metro-offline-check.mjs` | `npm run metro:offline`. Browser checks (offline, scope, weight). Needs Playwright with Chromium; not part of `npm test`. |
