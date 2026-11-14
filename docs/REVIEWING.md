# Reviewing a pull request

Most of a Peak Pune diff is generated HTML. That is collapsed on GitHub (see `.gitattributes`), so the
review is short. Allow about five minutes.

## 1. Read the top of the PR (1 min)
- [ ] It says what changed for a *user* and why. One idea per pull request.
- [ ] A listing or data change links its **public source**. No guesses, no invented details.
- [ ] Visual changes include a phone (about 390 px) and a desktop (about 1280 px) screenshot.

## 2. Check the automated gate (30 s)
- [ ] The **Tests** check is green. It runs the tests, `astro check`, a fresh build and a `public/` drift check.
- [ ] The Cloudflare preview opens. Click through the pages the PR touched.

## 3. Review only what a person wrote (3 min)
Use the **Files changed** tab. Generated files are collapsed ("Generated file") and can be skipped.

| If the PR touches | Look for |
| --- | --- |
| `data/` | A source link and `checked_at` on every changed field. Unknown stays `UNKNOWN`/`null`. A new public row also needs its id in `data/publication-audit.json`. |
| `site/`, `src/`, `public/tokens.css` | Brand kit respected (colours, Fraunces and Inter, flat blocks, 4 px ink outlines, no gradients or dark mode). 44 px touch targets. Readable without JavaScript. |
| `scripts/` | The build stays deterministic: no timestamps or absolute paths in output. |
| `metro/`, `data/metro/` | `npm run metro:check` and `gleam test` pass. Fares and station status are never invented; Line 3 status stays labelled media-reported until the operator confirms. |
| `tests/` | The new behaviour has a test that would fail without it. |

## 4. Sanity-check the generated side (30 s)
- [ ] A source change comes with matching `public/` changes. The drift check proves they are consistent.
- [ ] No secrets, personal data, tracking, or new third-party requests that are not mentioned in the PR.

## 5. Merge
Only the owner merges. A merge to `main` deploys the live site.
