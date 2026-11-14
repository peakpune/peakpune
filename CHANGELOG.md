# Changelog

What shipped to https://peakpune.com/, newest first. Each entry links its pull request. The site is deployed on
every merge to `main`, so there are no version numbers: dates are the history.

## 2026-11-14
- **Contributor welcome and repo tidy.** Welcome note for contributors from Pune and across India, good-first-issue template, cancelled superseded CI runs, removed unreferenced tooling files, labelled the side projects. ([#15](https://github.com/peakpune/peakpune/pull/15), [#22](https://github.com/peakpune/peakpune/pull/22), [#23](https://github.com/peakpune/peakpune/pull/23), [#24](https://github.com/peakpune/peakpune/pull/24))
- **History and Markets.** New sections fed by sourced batches 6 (history, English and Marathi) and 7 (market areas and shops); Metro guide shows Line 3 in passenger service with its reported WhatsApp booking path. Also adds the separate Android app and PunePedia projects (not part of the site build). ([#14](https://github.com/peakpune/peakpune/pull/14))

## 2026-11-13
- **Pune right now and add to calendar.** Home strip with AQI, next-hour temperature, sunrise, sunset, moonrise and moonset; "Add to Google Calendar" and `.ics` on dated events. ([#13](https://github.com/peakpune/peakpune/pull/13))
- **Pune Metro guide.** `/PuneMetroguide/` with an offline journey planner (Gleam and Lustre), fare and timetable tables, an area directory and a dated verification log. Line 3 (Pink) stations selectable, linked from the main nav, operator system map added to sources. ([#8](https://github.com/peakpune/peakpune/pull/8), [#9](https://github.com/peakpune/peakpune/pull/9), [#10](https://github.com/peakpune/peakpune/pull/10), [#11](https://github.com/peakpune/peakpune/pull/11), [#12](https://github.com/peakpune/peakpune/pull/12))
- **Mobile navigation** wraps instead of clipping links. ([#7](https://github.com/peakpune/peakpune/pull/7))
- **TypeScript, Astro and Svelte.** Static routes on a shared layout, a strict typed publication gate, and one Svelte island for plans. ([#6](https://github.com/peakpune/peakpune/pull/6))
- **Source-reviewed listings only.** Preview label and the top source-status notice removed; only audited ids reach the pages. ([#4](https://github.com/peakpune/peakpune/pull/4), [#5](https://github.com/peakpune/peakpune/pull/5))
- **Versioned asset URLs** so browsers never serve stale CSS or scripts. ([#3](https://github.com/peakpune/peakpune/pull/3))
- **Content and promotion strategy** research. ([#2](https://github.com/peakpune/peakpune/pull/2))
- **Static pages and sourced data.** Places, runs, treks, events and meetups with per-field evidence, area and collection pages, and search groundwork. ([#1](https://github.com/peakpune/peakpune/pull/1))
