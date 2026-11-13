# Batch 5: Moments and reference sheets (checked 2026-11-13)

| file | rows | what it is |
|---|---|---|
| `moments` | 12 | Original captions, each tied by `linked_id` to a verified Batch 1 or Batch 2 row |
| `neighbourhoods` | 8 | Character and centre point per area |
| `calendar` | 12 | Festivals, seasons, closures and races by month |
| `transport` | 3 | Metro and bus status |

## Moments

Every caption uses only facts already evidenced on the linked row (opening time, closure days,
route length, the guide's own advice). No moment links to a partial or unverified row; Toit Pune
was rejected for that reason.

## Neighbourhoods

All eight rest on English Wikipedia summaries, so every row is `partial` and secondary. Centre
coordinates are Wikipedia's. Aundh's are left null because the source's point is in central
Pune. Kothrud, Baner and Viman Nagar are missing: Wikipedia rate-limited the requests.

## Calendar

This is not a complete 12-month calendar. Three festival rows have month "UNKNOWN" because no
page opened states it, and exact 2027 dates were not sourced for any festival. February, April,
May and July have no row. Race and event dates come from Batch 3.

## Transport

- Metro: the official Maha Metro site shows 2 lines, 30 stations (29 operational) and 33.1 km.
  Wikipedia says 3 lines, 44 stations and 56.3 km as of November 2026. Both are recorded; the
  conflict is unresolved.
- PMPML: the official site returned 502, so bus service status is "UNKNOWN".
- Fares, timetables, autos, cabs and intercity rail were not collected.

## Spot check

The metro home page and one moment's linked row (Marz-O-Rin hours) were re-opened. 4 field strings
compared, 0 mismatches. Error rate found: 0 percent. Wikipedia-based rows were not re-opened
because of its rate limit.
