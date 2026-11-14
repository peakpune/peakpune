## What changed (for a user)

<!-- One or two sentences. One idea per pull request. -->

Linked issue (if any):

## Type
- [ ] Listing or data (`data/`)
- [ ] Page, style or content (`site/`, `src/`, `public/tokens.css`)
- [ ] Pune Metro guide or planner
- [ ] Tooling, tests or docs
- [ ] Something else:

## Public source for any listing or data change

<!-- Link the page you read. Unknown stays unknown: never guess. -->

## Screenshots
<!-- Phone (about 390 px) and desktop (about 1280 px) for anything visual. -->

## Review guide
<!-- Where should the reviewer look first? Generated files under public/ are collapsed; see docs/REVIEWING.md. -->

## Checks
- [ ] `npm test` passes (tests, type checks, fresh build, no `public/` drift)
- [ ] Regenerated `public/` is committed if I changed `data/`, `site/` or `src/`
- [ ] No secrets, personal data or unlicensed work
- [ ] UI checked at mobile and desktop sizes, if relevant
- [ ] No invented event details or claims
- [ ] Metro changes only: `npm run metro:check` and `npm run metro:test` pass
