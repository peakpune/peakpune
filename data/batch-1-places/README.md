# Batch 1: Places (checked 2026-11-13)

Files: `places.json` / `places.csv` (verified and partial rows), `places-unverified.json` /
`places-unverified.csv` (single secondary source only). Arrays in CSV are joined with `|`.

Tools used: headless Chromium (Playwright) and curl to open pages, OpenStreetMap Nominatim and
the OSM object API for coordinates. Every `source_url` was opened on 2026-11-13.

## Counts

| status | rows |
|---|---|
| verified (name, address and deep link each have primary evidence) | 20 |
| partial (some primary evidence, address or hours missing) | 8 |
| unverified (OpenStreetMap only, separate sheet) | 19 |

Target was about 100. The batch stops at 47 because that is where verifiable items ran out
within reachable sources. No DAY_TRIP rows in this batch.

## Controlled vocabulary

type: archive, bakery, bar, bookstore, cafe, cultural-centre, gallery, garden, heritage, market,
museum, park, restaurant, sweets, temple, zoo.

tags: archive, art, asian, bakery, bar, board-games, bookstore, brewery, cafe, cultural-centre,
european, events, family, film, gallery, garden, heritage, history, ice-cream, library,
literature, live-music, maharashtrian, marathi, market, memorial, museum, nature, park, research,
restaurant, snacks, south-indian, sweets, temple, thali, vegetarian, zoo.

## Core neighbourhoods used (each from a source address or page)

Baner, Budhwar Peth, Deccan Gymkhana, FC Road, Kalyani Nagar, Kasba Peth, Katraj, Kharadi,
Kondhwa Budruk, Koregaon Park, Koregaon Park Annexe, Kothrud, Law College Road, MG Road (Pune
Cantonment), NIBM Road, Nagar Road, Shivajinagar, Shukrawar Peth, Swargate. No PCMC rows yet.

## Notes on method

- `evidence[].corroborated` is true only when a second source gives the same value. Only the
  Joshi's Museum timetable (site and OSM) is close to that; string matching leaves it false.
- lat/lon always come from OpenStreetMap (secondary). For ways and relations they are the
  Nominatim centroid. Nominatim postcodes were ignored as unreliable.
- `freshness_days` is set where a source states its age: the NFAI footer date, the Monalisa
  Kalagram exhibition end date, and the OSM last-edit date for OSM-only rows.
- Flagged over 90 days old: NFAI, Monalisa Kalagram, and 18 of the 19 OSM-only rows.

## Dropped, with reasons

- Zapurza Museum: in Kudje village, outside core; no sourced distance or travel time for a DAY_TRIP label. Site data captured (hours, Rs. 250 fee from 1 April 2026) if a distance source turns up.
- Khadakwasla Dam, Sinhagad: district pages opened; held for Batch 2 as DAY_TRIP.
- Darshan Museum, Independence Brewing, Blades of Glory, Sukanta, TRTI tribal museum, PMC gardens page: guessed official URLs returned 502, 503 or 404.
- Effingut official site: TLS certificate mismatch. German Bakery official site: 502. Both kept only as OSM rows.
- High Spirits: thehighspirits.com is an unrelated business in Canada.
- Terttulia, Waari Book Cafe, Kayani Bakery (.com): parked "lander" pages, not venue sites.
- Savya Rasa: page lists a Chennai address only. Social: no Pune address on the page opened.
- Hard Rock Cafe: brand URL redirects to a global list without Pune details.
- Kalinga: domain redirects to another brand with no address.
- BookGanga: online store only on the page opened.
- Cafe Goodluck, Parvati Hill, Tulshibaug, Bund Garden, Chaturshringi, ISKCON, Dorabjee, Wadeshwar FC Road, Cafe Peter: OSM search returned a different object (a road, bus stop, metro station or another branch), so no coordinates were taken.
- Arthur's Theme third outlet: address not captured.
- Guessed domains that did not resolve (about 20, including Vaishali, Sujata Mastani, Dorabjee, Cafe Goodluck, Pune zoo): no row unless OSM had one.

## Gaps

- Official URLs were guessed, not searched. A search pass per venue would lift many OSM-only rows.
- Street food, live music venues and PCMC have no verified rows.
- Missing fields: hours for Pagdandi (official), Doolally, Cafe Peter, Hotel Shreyas, BORI, NFAI, Kasba Ganpati; addresses for Toit, Wadeshwar FC Road, Chitale Deccan and all five district-page heritage rows; ticket prices and hours for Aga Khan Palace, Shaniwar Wada, Lal Mahal and the zoo.
- Not attempted: Zomato, Swiggy, Google Maps, Instagram (logins, terms, or reviews).
- overpass-api.de reset the connection, so no bulk OSM queries.
- Joshi's Museum states two different minimum group sizes (3 and 4).

## Spot check

5 of 47 rows (about 10 percent) re-opened after the build: Raja Dinkar Kelkar Museum, Akshardhara,
Toit Pune, Gyaan Adab, Marz-O-Rin. 14 field strings compared against the live page, 0 mismatches.
Error rate found: 0 percent. The OSM-only sheet was not part of this sample.
