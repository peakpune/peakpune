# Pune Metro data

`metro.json` is the dataset behind the guide at `/PuneMetroguide/` and the Gleam journey planner.
`areas.json` maps common areas to their closest stations. `station-geo.json` holds the OpenStreetMap
coordinates those mappings were computed from.

**Verified on 2026-11-14 (Asia/Kolkata).** Every operational date on the guide is rendered from
`verified_on`; change it only when the data has been re-checked against the operators.

## What was checked, and how

Operator pages were opened in a browser and the fare and timetable images downloaded and read:
punemetrorail.org (home, fare chart, timetable, One Pune Card, Non-KYC card, Vidyarthi pass, project profile)
and punerimetro.in (home, station list, fare table, time table, route map, overview, amenities, contact).

- **Maha Metro fare matrix.** The chart image was read cell by cell, independently of the earlier transcription,
  with OCR used only to seed labelled examples and a template classifier reading all 812 off-diagonal cells
  (100% leave-one-out accuracy on the labelled set). 811 cells agreed.
- **One correction.** Kasarwadi to Bund Garden is **30** on the chart, in both directions. It had been transcribed as 25,
  which created a false asymmetric pair. `fares.maha_metro.corrections` records it and it is no longer disputed.
- **Eleven pairs stay disputed.** The chart prints a different fare in each direction. They are shown as "check the
  official chart", never as a fare. The operator's own fare calculator would settle them, but it sits behind
  Google reCAPTCHA and was not automated.
- **Line 3 fare matrix.** All 529 cells agree with the chart's fare-band colours, and the matrix is symmetric.
- **Timetables, contacts, WhatsApp link, fees.** Match the operator pages.
- **Discounts.** Now confirmed on operator pages: Vidyarthi pass 30% every day; Non-KYC card 10% weekdays and 30% weekends;
  the "10% on all rides" banner links to the One Pune Card page and does not say which tickets qualify.
- **Line lengths.** The timetable image says 17.5 km and 14.5 km; the project profile page says 17.4 km and 15.7 km.
  Both are shown, with their sources.

## What is not known

- **Line 3 station status.** The line is in passenger service since 4 Nov 2026 (operator timetable PDF; inauguration
  coverage), but neither operator publishes an open/closed list. All 23 statuses stay media-reported
  (`status_source: "media"`, `verified: false`): 17 open, 6 closed (targets: two by end Nov 2026, four by Jan 2027).
  The planner routes the open ones and labels them media-reported; closed ones stay blocked.
- Ticket validity rules, per-station first and last trains, a Line 3-specific WhatsApp number, and any Line 3 discount
  are not published on the pages checked. Launch-day media report the shared official number wa.me/9420101990 offers a
  'Line 3' option (`ticketing.line3.whatsapp_shared_number`, `status_source: "media"`, `verified: false`); the guide
  shows it labelled as reported.
- The 2022 timetable PDFs linked from the Maha Metro homepage are stale and are not used.

## Area directory

Each area's reference point and each station's position are OpenStreetMap coordinates; stations are ranked by
straight-line distance. Distances are kept in the data for audit but not shown, and no walking time is claimed.
Two of the brief's leads were corrected: Viman Nagar's closest station is Ramwadi, and Koregaon Park's are
Bund Garden and Yerwada.

## Re-verifying

1. Open the operator pages listed in `provenance`; update `metro.json` and bump `verified_on`.
2. `npm run metro:check` (validates the data), then `npm run metro:data` (regenerates the typed Gleam data).
3. `npm run metro:build`, `npm run build`, `npm test`.
