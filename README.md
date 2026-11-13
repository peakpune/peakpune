# Peak Pune

Everything Pune, in one scroll. An open-source starter for local events, meetups and
moments, with the Puneri attitude.

## Status

Work in progress. Explore, Places, Outdoors, Events, Meetups, Moments and Powered by are static
pages with their own URLs. Place, run and trek pages are generated from the sourced rows in `data/`.
The Pune event-discovery adapter is adapted from PuneAfterhours. The Events view displays a manual District Pune snapshot with source links,
check time and source health. Past dates are hidden daily and the snapshot expires
after 24 hours. No automatic source refresh is enabled. Meetup and Reddit network
feeds, uploads and submissions are not enabled. Sample moments are labelled; there are no real member
records or invented event listings in this repository.

## Run locally

Requirements: Node.js 22+ and Python 3. No npm install is needed.

```sh
npm test
npm run dev
```

Open http://localhost:4173. The site collects no personal data or uploads.

## Pages are generated, then committed

`public/` is still served as plain static files, with no build on deploy and no npm install.
The HTML in it is written by `npm run build` (`scripts/build.mjs`, no dependencies) from the
fragments in `site/` and the rows in `data/`: one page per place, route and trek, plus canonical
and share tags, JSON-LD, `sitemap.xml` and `robots.txt`. Edit `site/` or `data/`, run the build,
and commit the result. `npm run dev` runs the build first. Set `SITE_URL` if the origin is not
`https://peakpune.com`. A push to `main` deploys, so changes go through a pull request.

## Structure

- `public/`: generated pages, scripts, brand styles and local fonts.
- `site/`: page fragments. `scripts/build.mjs`: the static page generator.
- `data/`: sourced starter dataset, one folder per batch, with evidence per field.
- `docs/GROWTH.md`: research notes on search and community.
- `.agents/skills/`: design-principle references installed with `npx skills`.
- `src/events.js`: Pune/date/URL validation.
- `src/discovery.js`: adapted Pune source parsers, offline by default.
- `scripts/update-plans.mjs`: manual District Pune fetch/export command.
- `public/data/plans.json`: reviewed, time-limited manual snapshot.
- `public/plans.js`: source-linked cards, date filtering and expiry notice.
- `tests/`: local fixture and validation tests.
- `docs/SCOPE.md`: product scope and brand rules.

## Contribute

Fork this repository and open a pull request. Keep changes small, run `npm test`, and
include mobile/desktop screenshots for interface changes. See CONTRIBUTING.md.

Do not commit credentials, personal data or unlicensed work. Never auto-publish community
submissions. Additional providers and recurring refresh need review before enabling. The
frontend reads its local snapshot only and does not call event providers. See
`docs/PLANS.md` for manual update and source restrictions.

## Licence and attribution

Code: MIT, see LICENSE. Font licences are included in `public/fonts/`.
The supplied Peak Pune brand concept informed the interface. Source attribution for
the adapted PuneAfterhours fetcher is in `src/discovery.js` and docs/THIRD-PARTY.md.
