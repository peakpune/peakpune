# Security

Do not post secrets, private reports, member data or exploit details in public issues.
Report a vulnerability privately from the repository's Security tab ("Report a vulnerability").

## Abuse protection
`src/abuse-guard.js` holds dormant helpers adapted from the Afterhours signup API and is not used by any page or script. The live plan form is protected by the checks in `functions/_lib/api.js` (below).

## The `functions/` backend (live)
The plan-posting backend under `functions/` serves `/api/plans`, `/api/going`, `/api/report` and `/api/admin/*`, with a D1 schema in `migrations/0001_plans.sql`.

## What is stored
Plan title, date, time, area, optional venue, link and image, a status (pending, approved or rejected), and a salted hash of the IP address. Reports and "going" taps are stored as the plan plus that hash, so a repeat tap or report from the same IP address on the same plan is ignored. A shared IP address (a household, office or mobile network) can therefore count as one. Nothing is auto-published; approval is manual.

## Deployment settings
It needs all of these in the deployment (names only):

- `DB` — a bound D1 database with the `migrations/` schema applied.
- `ADMIN_PASSPHRASE` — a Cloudflare secret; the owner's review login.
- `HASH_SALT` — a dedicated secret for salting stored IP hashes. Set this explicitly: if it is omitted the salt is derived from `ADMIN_PASSPHRASE`, which couples a credential to the data salt and silently re-buckets every stored hash whenever the passphrase rotates.

## Before changing it

- Re-run `npm test` and re-check the behaviour above.
- Confirm the hardening in `functions/_lib/api.js`: same-origin checks, per-IP hourly limits, honeypot and minimum-fill-time screening that short-circuit before any database write, body-size limits enforced against the bytes actually read (not the `Content-Length` header), server-side image metadata stripping, and an HMAC-signed `HttpOnly; Secure; SameSite=Strict` admin session.
- Add response headers at the edge. `public/_headers` ships a baseline Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a referrer policy and a permissions policy for the static site; review it when the backend is introduced.
- Keep private vulnerability reporting enabled (see top) and do not open a public issue for vulnerabilities.
