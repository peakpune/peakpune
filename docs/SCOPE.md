# Product and brand scope

Source: the two PDFs supplied by the owner on 13 November 2026.
The nine-page PDF includes a three-page brand kit, Moments desktop/mobile and submission
layouts, then Explore, Events and Meetups. The three-page PDF is the narrower Moments
layout. This starter takes the broader scope and retains the shared Moments flow.

## Brand

- Chai Ink #1C1410; Peth Paper #F6EFE2; Wada Brick #B8381F.
- Haldi #E8A317; Mutha Sage #C9D6B5; Misal Clay #D9B99B.
- Fraunces 800/600 display; Inter 400/500/600 body; system Devanagari.
- Ink body text on paper/white/sage/clay; brick text on paper/white.
- Haldi for fills, not small text on paper.
- Rounded chips, 10 px inputs, 14 px cards, hard-shadow signboards.
- Dry local humour; never target caste, religion, gender, communities or private people.
- No UI emoji. Credit submitted work and redact faces, plates and phone numbers.

## Brand kit in the interface (13 November 2026)

How the kit is applied in `public/tokens.css`. The palette and fonts above are unchanged.

- Ground: Peth Paper. Cards and inputs may be white. Ink for text, rules and outlines.
- Colour blocks: category cards cycle Brick, Haldi, Sage and Clay as flat fills, no
  gradients. Text on Brick is white; text on Haldi, Sage and Clay is Ink.
- Outlines: plan cards, dialogs and the call-to-action use a 4 px Ink outline. Category
  blocks have none.
- Signboard: Haldi fill, 5 px Ink border, 8 px hard shadow, tilted 2 degrees.
- Navigation: pill tabs, with a solid Brick pill for the current page.
- Buttons: Ink pills with white text; secondary chips are Paper with an Ink outline. The
  pressed filter chip is solid Ink with white text.
- Small note text uses #4A3F38 (a darker Ink tint) for contrast. It is not a kit colour.
- Type: Fraunces 800 for page titles and 600 for card titles; Inter for everything else.
- Light theme only. No dark mode, gradients or glass effects.
- Inspired by the Holi-colour look of PuneAfterhours (flat blocks, bold outlines, pill
  tabs). Its colours and fonts are not used.

## Features planned, not implemented

- Events: dates, Pune areas, categories, free-entry filter, original source links.
- Meetups: real community listings with verified joining links.
- Moments: Patya, Traffic, Food, Language, Weather, Timings.
- Submissions: description, category, area, optional public credit and image.
- Moderation queue before publication; consent, deletion/reporting, spam and upload controls.

Do not silently bring Afterhours party-only filtering to Peak Pune: the concept explicitly
includes runs, books, tech, board games, trekking and general local community plans.
Do not turn unknown event pricing into "Free".
