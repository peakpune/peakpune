# Batch 2: Runs and outdoors (checked 2026-11-13)

Files: `outdoors.json`, `outdoors.csv`. Tools: headless Chromium (Playwright) and curl.
Every `source_url` was opened on 2026-11-13.

## Counts

| status | rows |
|---|---|
| verified | 26 |
| partial | 2 |
| unverified | 0 |

By scope: 8 CORE (running loops), 20 DAY_TRIP (19 treks, 1 dam). Target was about 40.

## Controlled vocabulary

type: run-route, trek, outdoor-spot.
tags: run-route, road-running, trail-running, loop, trek, fort, waterfall, lake, outdoor-spot, day-trip.

Extra fields beyond the schema: `distance_from_pune_km`, `travel_time_text`, `trek_time_text`,
`start_point`, `best_months`. `distance_km` is the route length only where the source gives one
number. `neighbourhood` on DAY_TRIP rows is the region label used by the source.

## Sources

- Running loops: PuneRunners Club routes pages. The source says they were plotted on
  OpenStreetMap data on 7 Oct 2026 and are "mapped only, not field-tested". Lighting was not
  checked, so `lit_at_night` is "UNKNOWN" for road loops and "no" for the two trail loops the
  source calls unlit.
- Treks: Pune Trekkers guides, each "last updated 6 Nov 2026". Distance and road time from Pune,
  difficulty, trek time, start point and best months are as stated there.
- Khadakwasla Dam: Pune district tourism page.

## Partial rows

- Katraj to Sinhagad (K2S): start is about 12 km from central Pune, no road time stated.
- Khadakwasla Dam: about 15 km from the city per the page body (its summary says 20 km), no travel time.

## Dropped, with reasons

- Alang Madan Kulang: about 220 km and two full days per the source, so not a day trip.
- Sinhagad district page: opened, but the Pune Trekkers guide carries the fields; not a separate row.
- PuneRunners "150 hikes and treks" list: distances from Pune are computed by that site and nothing else is recorded, so copying it would be bulk scraping with little verified content.
- Eight longer Magarpatta lines (10 to 50 km): variants of the same start; only the base lap is listed.
- Sarasbaug jogging track: already `place-sarasbaug-peshwe-park` in Batch 1; no route length is stated.

## Gaps

- No turfs, cycling routes or swimming pools: no official pages were opened for them.
- No run clubs with a fixed public meet point. PuneRunners plans runs inside its WhatsApp community; it belongs in Batch 4.
- No coordinates except the Magarpatta start point given by the source.
- Trek facts rest on one organiser source each. None are corroborated.
- Kalsubai, Ratangad, Harishchandragad, Kalu Waterfall and Aadrai are 130 to 190 km away (3.5 to 5 hours). They carry the DAY_TRIP label because the source lists them as treks near Pune; each row has a note.
- Entry fees, parking charges and forest permissions were not collected.
- `best_months` is null for Ghoradeshwar, Sinhagad, Kalu Waterfall and K2S because the page text did not parse to a clean month range.

## Spot check

3 of 28 rows (about 10 percent) re-opened: Torna Fort, Rohida Fort, Kharadi loop. 9 field strings
compared, 0 mismatches. Error rate found: 0 percent.
