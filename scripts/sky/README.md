# Pune sky page generator

Generates `site/pages/sky.html` (the body of https://peakpune.com/sky/) and `data/sky/events.json`.

```
pip install -r scripts/sky/requirements.txt
scripts/sky/generate.sh            # from today (IST), 15 months ahead
scripts/sky/generate.sh 2026-11-24 # fixed start date, same output every time
npm run build                      # renders public/sky/ from the fragment
```

- `calc.py` computes moon phases, lunar and solar eclipses seen from Pune, Mercury and Venus elongations, Mars, Jupiter and Saturn oppositions, close planet pairs and meteor-night moonlight, from the NASA JPL DE440s ephemeris with Skyfield. The 32 MB ephemeris is downloaded on first run into `scripts/sky/.cache/` (git-ignored, not committed).
- `stars.py` computes the monthly 9 pm star guide from `data/sky/bright-stars.json` (Yale Bright Star Catalogue, magnitude 2.0 or brighter).
- `render.py` writes the page fragment. Every dated row carries `data-d`; a small script in the page shows only the next 3 months from the visitor's date in IST. Without JavaScript the page shows the 3 months after the generation date.
- Output is deterministic for a given start date.

## What needs a human

- **Meteor nights.** `data/sky/meteor-nights.json` holds one peak night per shower, reused every year. `checked_years` lists the years compared with the [IMO calendar](https://www.imo.net/calendar/). Add a year there only after checking it; rows for other years are labelled "not yet checked" on the page. IMO publishes a web page, not a feed, so this is a yearly manual check.
- **Verification claims.** The "How this is calculated" section states what was checked and when. If the method changes, redo the checks it lists before keeping the wording.

## Scheduled refresh (not enabled yet)

`sky-refresh.workflow.yml.txt` is a proposed quarterly GitHub Actions workflow. To enable it, copy it to `.github/workflows/sky-refresh.yml` (a change to `/.github/`, owner-reviewed; pushing it needs a token with the Workflows permission, or add it in the GitHub web editor). It regenerates the data, page fragment and `public/sky/`, then opens a pull request. It never pushes to `main`. Until it is enabled, run `scripts/sky/generate.sh` by hand at least once a quarter: the page shows nothing new once the generated data runs out (about 15 months after the last run).

GitHub documents that scheduled workflows in a public repository are disabled after 60 days without repository activity, and that pull requests opened with the default token start their checks in an approval-required state ([docs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows), [docs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)).
