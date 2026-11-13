# Batch 3: Events (checked 2026-11-13)

Files: `events.json`, `events.csv`. Window: 13 November 2026 to 12 January 2027, plus recurring
items. Tools: headless Chromium (Playwright) and curl. Every `source_url` was opened on 2026-11-13.

This sheet holds organiser-sourced events only. The site's larger District Pune listing lives in
`public/data/plans.json`; it is a separate 24-hour snapshot with its own rules (docs/PLANS.md)
and is not copied here.

## Counts

| status | rows |
|---|---|
| verified | 5 |
| partial | 5 |
| unverified | 1 |

7 dated events (one now unverified) and 4 recurring ones. Target was about 60.

## Controlled vocabulary

tags: race, running, marathon, trek, camping, trip, adventure, astronomy, workshop, family, kids,
beginner, community, museum, temple, heritage, recurring.

Extra fields: `start_date` (date when no start time is stated; `start` stays null), `price_note`,
`linked_id` (the Batch 1 place the event happens at), `notes`.

## Dropped, with reasons

- Meetup: 13 Pune events were visible, but docs/PLANS.md records that Meetup's robots.txt and terms restrict this use. Not collected.
- BookMyShow: 403. Paytm Insider and Allevents: redirected to non-Pune pages. Townscript: notice page only.
- district.in listing URL I tried returned 404. The repository's own exporter covers District.
- NFAI event calendar: showed 0 events for November 2026.
- PuneRunners club events: both listed dates were already past.
- Monalisa Kalagram: listed exhibition ended 9 November 2025.
- Gyaan Adab: names its Book Club and other series but gives no dates.
- Doolally: a 13 Nov 5:30 PM listing was today and its venue line was not clearly Pune.
- Karawaan Matheran Herping Trail: date "yet to be announced".

## Gaps

- Start times are missing for the three races and the Kamshet trip, so `start` is null there.
- Both marathons rest on a PuneRunners guide (last checked 28 Oct and 6 Oct), not the race organisers' sites.
- No gigs, comedy, theatre or exhibitions from organiser pages. Venue sites opened in Batch 1 did not publish dated listings.
- Year is inferred for the Doolally listing, which shows day and month only.
- Shaniwar Wada show: `event_status` is "UNKNOWN" because the district page gives no current timing.

## Fresh handling

All event pages were opened on the delivery day, so `event_status` reflects 2026-11-13. Three rows
expire within three days (14 and 15 November). Nothing in this sheet is over 90 days old.

## Spot check

2 of 11 rows re-opened at the end of the batch, 7 field strings compared.

- Pune Trekkers camp: 3 of 3 fields matched.
- Karawaan Geminid Experience: 0 of 4 matched. The listing had been removed from the organiser's
  trips page between the first read and the re-check. The row is now `unverified` with
  `event_status` "UNKNOWN" and is not shown on the site. The Kamshet Paragliding listing on the
  same page still matched.

Error rate found: 1 of 2 rows (50 percent of the sample), caused by a source change, not a
transcription error. Treat every dated row as needing a re-open before use.
