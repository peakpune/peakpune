# Peak Pune

Everything Pune, in one scroll. An open-source starter for local events, meetups and
moments, with the Puneri attitude.

## Status

Work in progress. Explore, Places, Events, Meetups, Moments and Powered by are static pages
with their own URLs. Place pages are generated from the sourced rows in `data/`.
The Pune event-discovery adapter is adapted from PuneAfterhours. Live fetching and
submissions are not enabled. Sample moments are labelled; there are no real member
records or invented event listings in this repository.

## Run locally

Requirements: Node.js 22+ and Python 3. No npm install is needed.

```sh
npm test
npm run dev
```

Open http://localhost:4173. The preview collects no personal data or uploads.

`npm run build` regenerates `public/` from `site/` fragments and `data/`: one page per place,
canonical and share tags, JSON-LD, `sitemap.xml` and `robots.txt`. Set `SITE_URL` to the
production origin (default `https://peakpune.com`). Generated HTML is committed so any static
host can serve `public/` as is.

## Structure

- `public/`: generated pages, brand styles and local fonts.
- `site/`: page fragments. `scripts/build.mjs`: the static build.
- `src/events.js`: Pune/date/URL validation.
- `src/discovery.js`: adapted Pune source parsers, disabled network fetching by default.
- `tests/`: local fixture and validation tests.
- `docs/SCOPE.md`: product scope and brand rules.
- `data/`: sourced starter dataset, one folder per batch, with evidence per field.

## Contribute

Fork this repository and open a pull request. Keep changes small, run `npm test`, and
include mobile/desktop screenshots for interface changes. See CONTRIBUTING.md.

Do not commit credentials, personal data or unlicensed work. Never auto-publish community
submissions. Source-provider terms and live data behaviour need review before enabling
fetching; the frontend currently does not call external event sources.

## Licence and attribution

Code: MIT, see LICENSE. Font licences are included in `public/fonts/`.
The supplied Peak Pune brand concept informed the interface. Source attribution for
the adapted PuneAfterhours fetcher is in `src/discovery.js` and docs/THIRD-PARTY.md.
