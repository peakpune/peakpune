# Security

Do not post secrets, private reports, member data or exploit details in public issues.
A private reporting route must be configured by the owner before public launch.
Until then, do not collect personal data or accept uploads in this starter.

## Before submissions open
`src/abuse-guard.js` holds dormant helpers adapted from the Afterhours signup API: a hidden honeypot field (bots that fill it get a fake success and nothing is stored), a per-IP hourly limit and a total entry cap. It is not used by any page or script. No form is served today, so nothing is protected today.

## The `functions/` backend (present but not deployed)
The repository carries a working plan-submission backend under `functions/` (Cloudflare Pages Functions: `/api/plans`, `/api/going`, `/api/report`, and `/api/admin/*`) with a D1 schema in `migrations/0001_plans.sql`. It is **not** part of the live site: the static `public/` output never calls it, `npm run build` does not bundle it, and it is inert until it is deployed with the environment below. Until then it protects — and exposes — nothing.

It activates only when all of these are configured in the deployment:

- `DB` — a bound D1 database with the `migrations/` schema applied.
- `ADMIN_PASSPHRASE` — a Cloudflare secret; the owner's review login.
- `HASH_SALT` — a dedicated secret for salting stored IP hashes. Set this explicitly: if it is omitted the salt is derived from `ADMIN_PASSPHRASE`, which couples a credential to the data salt and silently re-buckets every stored hash whenever the passphrase rotates.

Before enabling it for a launch:

- Complete the storage, moderation and privacy review in the roadmap. No community submission is auto-published; approval is manual.
- Confirm the hardening in `functions/_lib/api.js`: same-origin checks, per-IP hourly limits, honeypot and minimum-fill-time screening that short-circuit before any database write, body-size limits enforced against the bytes actually read (not the `Content-Length` header), server-side image metadata stripping, and an HMAC-signed `HttpOnly; Secure; SameSite=Strict` admin session.
- Add response headers at the edge. `public/_headers` ships a baseline Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a referrer policy and a permissions policy for the static site; review it when the backend is introduced.
- Keep a private reporting route configured (see above) and do not open a public issue for vulnerabilities.
