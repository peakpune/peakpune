# data/

The source of truth. Every public page is generated from these files, and **nothing is published unless its id
is approved in `publication-audit.json`** (default deny).

| Folder or file | What it holds | Feeds |
| --- | --- | --- |
| `batch-1-places/` | Places to visit, with evidence per field. `places-unverified.*` is kept for review only. | `/places/` and area pages |
| `batch-2-outdoors/` | Running loops and treks, credited to PuneRunners Club and Pune Trekkers. | `/outdoors/` |
| `batch-3-events/` | Organiser-sourced events (dated) and recurring venue listings. | `/events/`, Event markup, `/calendar/*.ics` |
| `batch-4-meetups/` | Communities with public joining pages. | `/meetups/` |
| `batch-5-moments-reference/` | Moments, plus reference sheets: calendar, neighbourhoods, transport. | `/moments/` |
| `batch-6-history/` | Sourced history entries (English and Marathi). | `/history/` |
| `batch-7-shopping/` | Market areas and shops. | `/markets/` |
| `metro/` | Pune Metro lines, fares, timetables, areas and a dated verification log. See its [README](metro/README.md). | `/PuneMetroguide/` and the Gleam planner |
| `publication-audit.json` | Which row ids are approved to appear publicly, and decisions and overrides. | all pages |

## Rules for every row

- **Live sources only.** Each field carries `source_url`, `source_type` and `checked_at`.
- **Never invent.** Unknown is `null` or `"UNKNOWN"`. A missing price is never "Free".
- **Status** is one of `verified`, `partial` or `unverified`.
- JSON is the source; the CSV next to it is a convenience export.
- After editing, run `npm run build` and commit the regenerated `public/`.
