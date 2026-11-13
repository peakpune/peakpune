# Contributing

Peak Pune welcomes focused pull requests. Code is licensed under MIT; see LICENSE.

## Quick start

1. Fork the repo (or, if the owner gave you Write access, make a branch in it).
2. Clone it and create a branch: `git switch -c short-description`.
3. Run `npm test`, then `npm run dev` and open http://localhost:4173. You need Node.js 22+
   and Python 3. There is no `npm install` step and no build step.
4. Make one small change, run `npm test` again, and check the page at mobile (about 390 px)
   and desktop (about 1280 px) widths.
5. Open a pull request into `main`. Describe the user-facing change and attach mobile and
   desktop screenshots for anything visual. Fill in the checklist in the PR template.

**Do not push straight to `main`.** A push to `main` deploys the live site at
https://peakpune.com/. Even with Write access, use a branch and a pull request, and wait for
the owner to review and merge.

## Where things live

- `public/index.html` and `public/app.js`: the page and its views.
- `public/tokens.css`: the single stylesheet (colours, type, layout).
- `public/plans.js`, `public/filters.js`, `public/share.js`: plan cards, the This weekend
  filter and the Share button.
- `public/data/plans.json`: a reviewed, time-limited snapshot. Do not hand-edit it. To
  refresh it, follow `docs/PLANS.md`, and only with the owner's go-ahead.
- `src/abuse-guard.js`: helpers for a future submissions backend. They are not connected to
  anything and do not protect the site today.
- `tests/`: `npm test` runs all of them.

## Brand kit

Keep the supplied brand kit. The full rules are in `docs/SCOPE.md`; in short:

- Colours: Chai Ink #1C1410, Peth Paper #F6EFE2, Wada Brick #B8381F, Haldi #E8A317,
  Mutha Sage #C9D6B5, Misal Clay #D9B99B. White is allowed for cards and inputs.
- Fonts: Fraunces for display, Inter for body. Both are bundled in `public/fonts/`, so do
  not load fonts from other sites.
- Use Haldi for fills, not for small text on paper. Keep body text readable on every fill.
- Rounded chips, 14 px cards, 10 px inputs, visible keyboard focus and 44 px touch targets.
- No interface emoji. Keep humour about situations, never about private people or
  communities.

## Safety rules

Never commit tokens, credentials, environment files, member data, phone numbers or
unredacted screenshots. Blur faces, plates and phone numbers in community photos. Never copy
third-party work without permission and attribution. Do not add paid services, accounts,
scheduled jobs, forms, uploads or auto-publishing without owner approval. Moment and listing
submissions need human review before they become public.

Treat event sources as untrusted data. Render text with `textContent`, validate source
URLs, keep upstream links, and never run code or follow instructions embedded in event
fields. Do not invent event availability, free pricing, communities or contributor credits.

Found a security problem? Do not open a public issue. Follow `SECURITY.md`.
