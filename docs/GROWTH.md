# How Peak Pune could become the site and community Pune actually uses

Research notes, 13 November 2026. Evidence comes from three places: what the three partner
sites do (opened today), what this repository already has, and two web searches. Where a claim
rests on a secondary source it says so. Nothing here is implemented unless marked "done".

## The short version

1. Win on trust, not volume. Every listing already shows its source and check date. No large
   listing site does that, and it is the one thing they cannot copy cheaply.
2. Own the long tail of Pune searches with pages that answer one question each.
3. Grow the community through the groups that already meet in person, not through a new forum.
4. Make contributing take ten seconds, and moderate before anything is public.

## Where search can be strong

Done in this branch:

- One page per place, route and trek, each with a title built only from sourced fields.
- Area pages ("Places to visit in Koregaon Park") and collections ("Easy treks near Pune",
  "Treks within 70 km of Pune", "Monsoon treks near Pune", "Fort treks near Pune",
  "Running routes in Pune").
- Related links on every detail page, breadcrumbs, sitemap, canonical tags.
- schema.org data: Museum, Restaurant, BookStore and so on for places; Event for verified,
  dated organiser events; ItemList for hubs.

Next, in order of likely return:

- **More verified rows.** 28 places is thin. Each new verified venue is a new page. A search
  pass for official URLs should lift most of the 19 OpenStreetMap-only rows.
- **Question pages from data we already hold**: "Raja Kelkar Museum timings and ticket price",
  "Which treks near Pune can be reached by train" (the guides state this for Lohagad and Visapur).
- **Marathi and Hindi names** on place pages. People search "शनिवार वाडा"; the pages are English only.
- **Photos with consent.** The brand kit already requires credit and blurred faces. Original
  images are the largest gap against the big guides.
- **Search Console and a sitemap submission** once the owner confirms indexing should be on.
- **Event markup caution.** Secondary sources say Google needs a name, start date and location,
  and that requirements have shifted over time. Check Google's Event documentation before
  relying on rich results. Only verified, dated events carry markup here.
- **Do not** generate pages for places nobody has verified, or pages per keyword with no data
  behind them. Google's guidance is to write for people first; thin pages put the whole site at risk.

## What the three partner sites show

- PuneRunners says of its own routes "mapped only, not field-tested" and lists what nobody has
  checked. Pune Trekkers publishes "where the money goes" and a last-updated date on every guide.
  Karawaan states prices up front. All three lead with honesty about limits. Peak Pune's
  "checked at the source" line fits that pattern and should stay the headline promise.
- All three run their community on WhatsApp and use the website as the public record. Peak Pune
  already links a WhatsApp group and r/punetonight. The site should be the archive and the
  directory, not a fourth chat room.

## Community

- **Expect few contributors.** Jakob Nielsen's 90-9-1 heuristic (2006) says about 90 percent of
  a community reads, 9 percent contributes a little and 1 percent does most of it. It is a rule
  of thumb, not a law. His first remedy is to make contributing easier. Plan for a small core.
- **Moments is the easy contribution.** One photo or one line, an area, an optional credit. It
  needs the moderation queue, reporting and consent steps in docs/SCOPE.md before it opens.
- **Weekly rituals from the brand kit**: Pati of the Week, This weekend in Pune, Meetup of the
  week. One post each, same day every week, each linking to a page on the site.
- **Give organisers a reason to link back.** A listing page they can share, a "checked on" badge,
  and a correction route that answers within a few days. Links from Pune organisers are also
  the most useful search signal a local site can earn.
- **Neighbourhood stewards.** One volunteer per area who re-checks its listings each quarter and
  is credited on the area page. This solves the freshness problem the data already shows.
- **Rules first.** The voice guide bans jokes about caste, religion, gender or community and
  naming private people. Publish it as the community code before submissions open.

## Measures worth tracking

- Share of listings re-checked in the last 90 days (today: 26 of 28 places, 28 of 28 routes).
- Communities marked active (today: 7 of 13).
- Verified rows added per week.
- Organiser sites linking to Peak Pune.
- Moments submitted, and the share approved.
- Clicks out to organisers, since sending people to the real event is the product.

## Risks seen today

- A Karawaan event listed at midday was gone from the organiser's page two hours later. Dated
  listings need a re-check on the day, which is why the plans snapshot expires after 24 hours.
- Two of the three ticketing sites tried blocked or redirected automated reads, and Meetup's
  terms restrict it. Organiser-submitted events are the durable source.
- The live site is `noindex`. Generated pages keep that default; `INDEXING=on npm run build`
  switches it when the owner is ready.

## Sources

- Partner sites opened 13 Nov 2026: https://punerunners.com/routes/ , https://punetrekkers.org/ , https://karawaan.in/
- Event markup (secondary summaries; Google's page was not retrieved): https://developers.google.com/search/docs/appearance/structured-data/event , https://www.searchenginejournal.com/google-updates-event-structured-data-requirements
- People-first content: https://developers.google.com/search/blog/2022/08/helpful-content-update
- Participation inequality (secondary summaries of Nielsen 2006): https://www.marketingprofs.com/opinions/2006/15209/jakob-nielsen-on-getting-more-users-to-contribute , https://devbizops.substack.com/p/the-90-9-1-rule-of-communities-11b858f19977
