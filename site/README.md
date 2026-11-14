# site/

Hand-written page fragments and assets that the generator reads. Edit these, then run `npm run build`.

| Path | What |
| --- | --- |
| `pages/*.html` | Body fragments for Events, Meetups, Moments, History, Markets and Powered by. Placeholders like `<!--MEETUPS-->` are filled from `data/`. |
| `cta.html`, `mark.svg.html` | Shared call-to-action and the logo mark. |
| `metro/metro.css` | Styles for the Pune Metro guide and planner. |
| `metro/sw.template.js` | Service worker template for `/PuneMetroguide/`. |

The site-wide stylesheet is `public/tokens.css` (hand-written, not generated).
