# tests/

`npm test` runs every suite with `node --test`, then type-checks, rebuilds and fails if `public/` drifted.

| Suite | Guards |
| --- | --- |
| `build.test.js` | The renderer: HTML escaping, safe links only, structured data that omits unknowns, titles that name only known fields. |
| `navigation.test.js` | Mobile navigation wraps instead of hiding links. |
| `metro.test.js` | Metro data validity, disputed fares, Line 3 status rules, service-worker contract, bundle and Gleam data in sync. |
| `calendar.test.js` | `.ics` and Google Calendar rules: timed vs all-day, no invented end, escaping, folding. |
| `pune-now.test.js` | Weather strip model: next hour, sunrise and sunset in IST, AQI bands, missing data, moon maths. |
| `events.test.js`, `discovery.test.js` | Event validation (real dates, IST, Pune only, dedupe, secure links) and the District, Meetup and Reddit parsers. |
| `snapshot.test.js`, `filters.test.js`, `share.test.js` | Plans snapshot expiry, weekend filter, sharing. |
| `update-plans.test.js` | Manual plans export is atomic and never invents fields. |
| `abuse-guard.test.js` | The dormant form-backend helpers. |

The Gleam planner has its own tests: `npm run metro:test` (needs the Gleam toolchain).
