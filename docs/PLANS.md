# Pune plans updater

The parsers in `src/discovery.js` were adapted from the owner's PuneAfterhours project.
`scripts/update-plans.mjs` adds the missing runnable export, without copying credentials,
Redis data, Mumbai/India feeds or party-only taste filters.

```sh
npm test
node scripts/update-plans.mjs                 # inspect counts and a small sample
node scripts/update-plans.mjs --write /tmp/peakpune-plans.json
```

This is a manual command, not a scheduled job. Node.js 22+ is sufficient; no API key,
package install, account login or paid service is required. It reads five fixed public
District Pune category pages once each, sequentially, with timeout/size limits. A failed
source is visible, dates are evaluated in Asia/Kolkata, repeated plans are deduplicated,
and an empty/failed run cannot overwrite an existing export. Unknown prices stay blank.
The export expires after 24 hours; consumers must hide expired snapshots and past dates.
Platform-listed is not independently organiser-verified. Link to the provider before
any booking and recheck current prices, dates, cancellation and availability there.

The command does not change the live frontend, commit output, schedule itself or deploy.
The reviewed frontend reads `public/data/plans.json`, filters past dates at load and
midnight IST, and hides a snapshot once its 24-hour expiry is reached. It never
requests event providers from visitors' browsers. To publish a new manual snapshot,
export to `public/data/plans.json`, inspect source health and the resulting cards,
then commit the reviewed update. Git pushes to main trigger deployment, not data refresh.
Meetup/Reddit network feeds, uploads and submissions remain disabled.

## Source checks, 13 November 2026

- https://www.district.in/llms.txt describes public-page reading and citation.
- https://www.district.in/robots.txt allows the selected query-free event paths. No account,
  checkout, booking or payment pages are fetched.
- https://www.district.in/events/music-in-pune-book-tickets contains the JSON-LD ItemList
  structure consumed by the existing parser. Parser failures surface as unavailable.
- https://www.meetup.com/robots.txt disallows the current discovery-query parameters.
  https://www.meetup.com/terms/ also restricts extraction for an unpermitted commercial
  purpose. Meetup remains offline pending a suitable permitted route.
- https://www.reddit.com/robots.txt disallows crawling. Reddit remains offline pending a
  permitted integration. Its existing parser is retained for owner-supplied fixtures.

Recheck provider conditions before enabling additional sources or changing usage. Public
crawl guidance is not a blanket licence for copying descriptions, reviews or images.
This exporter keeps short event facts and links, not full source pages, reviews or photos.
