# Static stack maintenance

The upgrade uses TypeScript first, Astro for static routes/layout, and Svelte for the existing interactive plans UI. It does not change source data, branding, indexing, submissions, hosting settings or provider permissions.

## Build path

1. `npm ci` installs the exact lockfile (Node 22.23.4+).
2. `npm run build:types` compiles strict TypeScript in `src/client/` to `public/lib/`. Tests and the publication renderer use this same code.
3. `scripts/prepare-astro.mjs` prepares only known static assets plus the existing sitemap/robots/manifest.
4. Astro generates every route through `src/pages/` and `src/layouts/SiteLayout.astro`. Reviewed listing content remains in `scripts/build.mjs` during this incremental migration.
5. `scripts/publish-static.mjs` copies the static build into committed `public/`. Cloudflare continues to serve it as plain files, without an adapter or server.

Edit source, never hashed `_astro` bundles. Rebuild and commit generated output with each source change. CSS/fonts stay unchanged. Do not extend the manual plans snapshot's expiry to make a test pass. Test fixtures must never be published as listing data.

`src/client/snapshot.ts` validates external JSON at runtime, allows only HTTPS District links without credentials, drops invalid/non-Pune/past rows and fails closed on expired/invalid envelopes. The Svelte island clears visible cards at expiry/midnight refresh and cleans up timers. With JavaScript disabled, source calendars and reviewed static content remain usable.

## Existing CI entry point

The original GitHub workflow is unchanged and calls `npm test` on Node 22. In GitHub Actions only, `pretest` installs the exact lockfile with lifecycle scripts disabled and compiles TypeScript; `posttest` runs the strict checks, static build and output-drift check after the regression tests. Local users run `npm ci` once and then the documented commands. No token scopes or branch protections were changed.

## Build-only dependency advisory

The current pinned official Svelte integration pulls `deepmerge@4.3.1`, for which npm reports a low-severity prototype-poisoning advisory (GHSA-gcqx-w48m-w2h4), propagated through the Vite plugin and Astro integration. At implementation time npm's suggested fix was an incompatible ancient integration, not a compatible patch. Do not force that downgrade. These packages are development/build dependencies, not a deployed server. Do not merge untrusted input into build configuration. Recheck `npm audit` and update the integration when a compatible fix exists.

Advisory: https://github.com/advisories/GHSA-gcqx-w48m-w2h4
Official integration: https://docs.astro.build/en/guides/integrations-guide/svelte/
Svelte TypeScript: https://svelte.dev/docs/svelte/typescript
