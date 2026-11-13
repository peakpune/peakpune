# Security

Do not post secrets, private reports, member data or exploit details in public issues.
A private reporting route must be configured by the owner before public launch.
Until then, do not collect personal data or accept uploads in this starter.

## Before submissions open
`src/abuse-guard.js` holds dormant helpers adapted from the Afterhours signup API: a hidden honeypot field (bots that fill it get a fake success and nothing is stored), a per-IP hourly limit and a total entry cap. It is not used by any page or script. No backend or form exists yet, so nothing is protected today. Wire it into the first form backend and add storage, moderation and privacy review before opening submissions.
