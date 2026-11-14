# Test checklist

Automated tests: `flutter test` (unit + widget). Content gate: `python3 tools/content.py validate` and, before release, `release-check`.

Tick each manual check on a real Android phone (and one small-screen emulator) before any release candidate.

## Automated (in `test/`)

| Area | Test |
|---|---|
| Navigation | `widget_test.dart` — all four tabs open; no Map tab |
| Entry detail | featured story shows status, review notice, sources |
| Source links | citation opens source viewer with URL |
| Bookmarks | add from entry, appears in Saved; persistence in `app_state_test.dart` |
| English only | no language switch; content test finds no Devanagari text |
| Unlock | `unlock_test.dart` — free samples readable, locked entries show the offer, buy / pending / failed / cancelled / restore / no store |
| Search | finds by title, body, source title, Devanagari headword; filters; diacritics |
| Research leads | hidden from default timeline and search; visible when switched on |
| Empty topics | Food shows the honest empty message |
| Font scaling | entry renders at 1.6× reader scale without overflow exceptions |
| Accessibility | tap-target size, labelled targets, text contrast on main screens |
| Content integrity | `content_test.dart` — unique ids, related ids resolve, citations resolve, consulted source on every public entry, coordinates in region, no fixtures, no placeholder text |

## Manual

### Navigation & layout
- [ ] Every tab opens; back navigation returns to the same scroll position
- [ ] Rotate the phone on an entry; nothing overflows
- [ ] Light, dark and system themes all readable; status colours distinguishable

### Offline reading
- [ ] Airplane mode, cold start: library loads, every entry opens, search works
- [ ] “Open in Google Maps” on a place opens the right spot (try with and without the Maps app)
- [ ] Airplane mode: tapping “Open source” shows “Could not open the link.” (no crash)

### Accessibility
- [ ] TalkBack: every tab, entry, citation, pin and switch is announced with a sensible label
- [ ] TalkBack: search result count is announced as it changes
- [ ] System font size at largest + in-app 160 %: no clipped text on Discover, Timeline, Entry, Settings
- [ ] Keyboard / switch access can reach the language toggle and bookmark button

### Sources
- [ ] Every citation chip opens the right source; page numbers shown
- [ ] “Open source” opens the browser on the right page for a sample of 10 sources
- [ ] Copy citation puts a usable citation on the clipboard
- [ ] Source register lists all sources; filter by consulted works

### Content release gate
- [ ] `python3 tools/content.py release-check` passes
- [ ] No `[DEV FIXTURE]` text anywhere in a release build
- [ ] No unlabeled placeholders, invented dates or invented coordinates
- [ ] Spot-check 5 entries against their sources (read the source, not the summary)

### Product & compliance
- [ ] **Name clearance:** search trademark registries (India IP office, WIPO Global Brand Database) and the Play Store for “PunePedia” and close variants; get legal advice before publishing
- [ ] Purchase model decided and configured (`docs/PURCHASE_MODEL.md`)
- [ ] In-app product `punepedia_full_unlock` created and active in Play Console; test purchase, cancel, and restore after reinstall on a licence-tester account
- [ ] A locked entry offers the unlock; a free sample (the featured story) reads in full without it
- [ ] App icon and store assets created (no copyrighted imagery)
- [ ] Privacy policy URL ready; Play Data safety form: no data collected
- [ ] Release signed with a key stored outside the repo
