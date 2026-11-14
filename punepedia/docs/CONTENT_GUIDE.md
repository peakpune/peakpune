# Content guide

PunePedia's content lives in `content/` as JSON. The app never contains content in its screens, so adding or revising an entry needs no code changes.

```
content/
  sources.json          every source, with an evaluation
  taxonomy.json         eras, categories, collections
  meta.json             contentVersion — bump on every content change
  entries/*.json        entries (any number of files; each holds {"entries": [...]})
  fixtures/             invented test data (never shipped)
```

Workflow:

```bash
python3 tools/content.py validate     # check only
python3 tools/content.py build        # check + compile to assets/content/library.json
python3 tools/content.py stats        # coverage numbers
python3 tools/content.py register     # regenerate docs/SOURCE_REGISTER.md
python3 tools/content.py release-check
```

## Rules

1. **Never invent** dates, stories, citations or coordinates. If a fact has no source, leave it out or file it as a research lead.
2. **AI-written prose is not evidence.** Summaries may be drafted with AI help, but every factual segment must cite a source, and the entry's `review.state` stays `draft` until a person has checked it against the sources.
3. **Evaluate sources; don't trust names.** The 1885 Gazetteer, BISM papers, archaeology reports and inscriptions are research *directions*. Record what a source actually says, on which page, and how reliable that particular statement is.
4. **Separate evidence types.** Use segment kinds: `evidence` (documented), `tradition` (told, not established), `disputed` (sources disagree — show each side), `context`, `note` (editor's note; may have no citation).
5. **Contested questions stay contested.** Pune's earliest name and early copper-plate dates are `disputed` / `research-lead`, not settled facts.
6. **Coordinates need provenance.** `location.status` is `sourced` until an editor or the publisher checks the point on a survey map or on site; then `verified`. Release requires `verified`. Verified places get an “Open in Google Maps” button.
7. **Images need credits.** Every media item needs `credit`, `license` and ideally `sourceUrl`. No image without a known licence.
8. **English only.** Text fields are objects with a single `en` key. The content tool rejects any other language key and the old `headword` field.
9. **Free samples.** `"freeSample": true` makes an entry readable without the in-app unlock. Keep a handful, including the featured story (see `docs/PURCHASE_MODEL.md`).

## Entry schema

```jsonc
{
  "id": "vishrambaug-wada",            // lowercase, digits, hyphens; never reuse
  "type": "place",                     // event | place | neighbourhood | person | food | festival | term | institution
  "categories": ["place"],             // ids from taxonomy.json (an entry can be in several)
  "status": "verified",                // verified | disputed | research-lead
  "era": "peshwa",                     // id from taxonomy.json, or null
  "timeline": false,                   // show on the Timeline tab?
  "featured": false,                   // optional; picks the Discover story
  "freeSample": false,                 // optional; readable without the unlock
  "date": {                            // or null
    "start": "1807",                   // YYYY | YYYY-MM | YYYY-MM-DD
    "end": null,
    "precision": "year",               // day | month | year | decade | century
    "label": { "en": "1807" }
  },
  "title":   { "en": "…" },
  "summary": { "en": "…" },
  "body": {
    "en": [
      { "kind": "evidence", "text": "…", "cites": [{ "source": "src-…", "pages": "p. 12" }] }
    ]
  },
  "location": {                        // or null — places get an "Open in Google Maps" button with this
    "lat": 18.52028, "lng": 73.85667,
    "status": "sourced",               // sourced | verified
    "source": "src-…",
    "note": "How the point was obtained"
  },
  "locationNote": { "en": "Why there is no location yet" },
  "media": [
    { "asset": "assets/media/x.jpg", "caption": {"en": "…"},
      "credit": "Photographer / archive", "license": "CC BY-SA 4.0", "sourceUrl": "https://…" }
  ],
  "related": ["ev-1807-vishrambaug"],
  "review": {
    "state": "draft",                  // draft | reviewed
    "draftedOn": "2026-10-31",
    "draftedWith": "AI-assisted summary of the listed sources",
    "lastReviewed": null,              // set with reviewer when state = reviewed
    "reviewer": null
  }
}
```

### Statuses

| Status | Meaning | Default timeline |
|---|---|---|
| `verified` | Each statement is backed by a cited source (shown as “Source-checked”). | Shown |
| `disputed` | Sources disagree; the entry presents each reading. | Shown, marked |
| `research-lead` | An open question or unverified claim to investigate. | Hidden unless the reader turns leads on |

A `verified` timeline entry must have a date. Public entries must cite at least one source with `"consulted": true`.

## Source schema

```jsonc
{
  "id": "src-gazetteer-1885-p3",
  "kind": "reference",       // primary | scholarly | institutional | reference | news | tertiary
  "title": "…", "author": "…", "publisher": "…", "year": "1885",
  "url": "https://…",        // https only
  "accessed": "2026-10-31",
  "consulted": false,        // true only if someone actually read it
  "citedVia": "src-…",       // required when consulted is false (unless role is research-direction)
  "role": "research-direction", // evidence | finding-aid | cited-via | research-direction
  "reliability": "What this source is good and bad for."
}
```

## Adding media

1. Put files in `assets/media/` (create it) and add `- assets/media/` under `flutter: assets:` in `pubspec.yaml`.
2. Reference them from an entry's `media` list with credit and licence.
3. Keep files small (≤ 300 KB, ~1600 px wide WebP or JPEG) — they ship inside the app.

## Reviewing an entry

1. Open each cited source and confirm every sentence. Add page numbers.
2. Prefer primary or scholarly sources over encyclopaedia pages; replace `cited-via` sources with ones you actually read (`consulted: true`).
3. Set `review.state` to `reviewed`, fill `lastReviewed` and `reviewer`, and bump `content/meta.json` `contentVersion`.
