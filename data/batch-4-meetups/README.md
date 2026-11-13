# Batch 4: Meetups (checked 2026-11-13)

Files: `meetups.json`, `meetups.csv`. Tools: headless Chromium (Playwright) and curl. Every
`source_url` was opened on 2026-11-13. Target was about 40; this sheet has 13.

| status | rows |   | activity_state | rows |
|---|---|---|---|---|
| verified | 7 |   | active | 7 |
| partial | 6 |   | UNKNOWN | 5 |
| unverified | 0 |   | DORMANT | 1 |

"active" needs a dated public activity within 90 days or an upcoming dated session. Extra fields:
`cost_note`, `linked_id` (Batch 1 venue), `notes`.

tags: running, walking, trekking, hiking, travel, camping, volunteering, member-led, tech,
developers, cloud, python, open-source, heritage, walks, history, books, book-club, food, free,
beginner, paid-trips.

## Dropped, with reasons

- Peak Pune's own WhatsApp group and r/punetonight (linked on the live site): WhatsApp invite pages cannot be read without joining, and Reddit disallows crawling per docs/PLANS.md.
- Meetup.com groups: not opened, for the reasons recorded in docs/PLANS.md.
- TEDxPune: a past annual event (3 October 2026), not a meetup. It is in the Batch 5 calendar.
- Boat Club Quiz Club, Pune cycling and Toastmasters: guessed URLs did not resolve. Pune User Group: 502.
- Janwani heritage walks: site timed out (522).
- Doolally "join a community" copy: no named community or schedule.

## Gaps

- No fixed public meet points: every running and trekking group plans inside WhatsApp.
- No board game, music, cycling, language or quiz groups.
- Member counts are the groups' own figures.
- Gyaan Adab's book club is marked DORMANT on the strength of one 2020 page; it may run offline.
- Personal phone numbers on organiser pages were not recorded.

## Spot check

2 of 13 rows re-opened (Pagdandi Book Club, GDG Pune). 7 field strings compared, 0 mismatches once
the page was read with the same Indian date format as the first read. The three Pagdandi-listed
book club dates were all still on the events page. Error rate found: 0 percent.
