#!/usr/bin/env python3
"""PunePedia content tool.

Commands
  validate        Check content/ for schema, sourcing and cross-reference errors.
  build           Validate, then write assets/content/library.json (and an empty
                  assets/content/dev_fixtures.json).
  build --fixtures  Same, but also copy the development fixtures into the app.
  release-check   Strict pre-publication gate. Fails unless every public entry is
                  editor-reviewed, every map location is verified, fixtures are
                  absent and the purchase model is set.
  stats           Print coverage numbers (entries, statuses, review).
  register        Regenerate docs/SOURCE_REGISTER.md from content/sources.json.

Only the Python standard library is used. Run from the repository root:
  python3 tools/content.py build
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
ASSETS = ROOT / "assets" / "content"

SCHEMA_VERSION = 1
STATUSES = {"verified", "disputed", "research-lead"}
TYPES = {"event", "place", "neighbourhood", "person", "food", "festival", "term", "institution"}
SEGMENT_KINDS = {"evidence", "tradition", "disputed", "context", "note"}
NEEDS_CITE = {"evidence", "tradition", "disputed", "context"}
REVIEW_STATES = {"draft", "reviewed", "fixture"}
LOCATION_STATUSES = {"sourced", "verified"}
PRECISIONS = {"day", "month", "year", "decade", "century"}
SOURCE_KINDS = {"primary", "scholarly", "institutional", "reference", "news", "tertiary"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,63}$")
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")
PLACEHOLDER_RE = re.compile(r"lorem ipsum|\bTODO\b|\bTBD\b|PLACEHOLDER|\[DEV FIXTURE\]", re.I)
# Generous box around Pune district; anything outside is almost certainly a typo.
LAT_RANGE = (17.8, 19.4)
LNG_RANGE = (73.2, 75.2)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, where: str, msg: str) -> None:
        self.errors.append(f"ERROR   {where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"warning {where}: {msg}")

    def print(self) -> None:
        for line in self.warnings + self.errors:
            print(line)
        print(f"\n{len(self.errors)} error(s), {len(self.warnings)} warning(s)")


def load_json(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def load_content(include_fixtures: bool):
    taxonomy = load_json(CONTENT / "taxonomy.json")
    sources = load_json(CONTENT / "sources.json")["sources"]
    entries = []
    files = sorted((CONTENT / "entries").glob("*.json"))
    for f in files:
        for e in load_json(f)["entries"]:
            e["_file"] = str(f.relative_to(ROOT))
            entries.append(e)
    fixtures = []
    if include_fixtures:
        for e in load_json(CONTENT / "fixtures" / "dev_fixtures.json")["entries"]:
            e["_file"] = "content/fixtures/dev_fixtures.json"
            fixtures.append(e)
    return taxonomy, sources, entries, fixtures


def check_localized(rep: Report, where: str, value, required_en=True, kind="text"):
    """Text fields are objects of the form {"en": "..."}. PunePedia is
    English-only, so any other language key is an error."""
    if not isinstance(value, dict):
        rep.err(where, f"{kind} must be an object with 'en'")
        return
    en = value.get("en")
    if required_en and (not isinstance(en, str) or not en.strip()):
        rep.err(where, f"{kind}.en is required")
    for k in value:
        if k != "en":
            rep.err(where, f"{kind}.{k}: only English ('en') text is supported")


def check_sources(rep: Report, sources) -> dict:
    by_id = {}
    for s in sources:
        sid = s.get("id", "?")
        where = f"sources.json:{sid}"
        if sid in by_id:
            rep.err(where, "duplicate source id")
        by_id[sid] = s
        for field in ("title", "author", "publisher", "year", "url", "accessed", "reliability"):
            if not str(s.get(field, "")).strip():
                rep.err(where, f"missing '{field}'")
        if s.get("kind") not in SOURCE_KINDS:
            rep.err(where, f"kind must be one of {sorted(SOURCE_KINDS)}")
        if not str(s.get("url", "")).startswith("https://"):
            rep.err(where, "url must be https")
        if not isinstance(s.get("consulted"), bool):
            rep.err(where, "'consulted' must be true or false")
    for s in sources:
        via = s.get("citedVia")
        if via and via not in by_id:
            rep.err(f"sources.json:{s['id']}", f"citedVia '{via}' does not exist")
        if s.get("consulted") is False and not via and s.get("role") != "research-direction":
            rep.err(f"sources.json:{s['id']}", "unconsulted source needs 'citedVia' or role 'research-direction'")
    return by_id


def check_entry(rep: Report, e: dict, taxonomy, src_by_id, all_ids, is_fixture: bool):
    eid = e.get("id", "?")
    where = f"{e.get('_file', '?')}:{eid}"
    if not ID_RE.match(str(eid)):
        rep.err(where, "id must be lowercase letters, digits and hyphens")
    if is_fixture:
        if not str(eid).startswith("fx-") or e.get("fixture") is not True:
            rep.err(where, "fixtures must have an id starting 'fx-' and \"fixture\": true")
    else:
        if str(eid).startswith("fx-") or e.get("fixture"):
            rep.err(where, "fixture records are not allowed in content/entries")
    if e.get("type") not in TYPES:
        rep.err(where, f"type must be one of {sorted(TYPES)}")
    cats = {c["id"] for c in taxonomy["categories"]}
    for c in e.get("categories", []):
        if c not in cats:
            rep.err(where, f"unknown category '{c}'")
    if not e.get("categories"):
        rep.err(where, "at least one category is required")
    if e.get("status") not in STATUSES:
        rep.err(where, f"status must be one of {sorted(STATUSES)}")
    eras = {x["id"] for x in taxonomy["eras"]}
    if e.get("era") is not None and e.get("era") not in eras:
        rep.err(where, f"unknown era '{e.get('era')}'")
    if e.get("timeline") and not e.get("era"):
        rep.err(where, "timeline entries need an era")
    if "freeSample" in e and not isinstance(e["freeSample"], bool):
        rep.err(where, "freeSample must be true or false")
    if e.get("freeSample") and e.get("status") == "research-lead":
        rep.err(where, "research leads can't be free samples (they're hidden by default)")

    check_localized(rep, where, e.get("title"), kind="title")
    check_localized(rep, where, e.get("summary"), kind="summary")

    body = e.get("body") or {}
    en_body = body.get("en")
    if not isinstance(en_body, list) or not en_body:
        rep.err(where, "body.en must be a non-empty list of segments")
        en_body = []
    for k in body:
        if k != "en":
            rep.err(where, f"body.{k}: only English ('en') text is supported")
    if "headword" in e:
        rep.err(where, "headword is no longer supported (English-only library)")
    consulted_cites = 0
    for i, seg in enumerate(en_body):
        sw = f"{where} segment {i}"
        if seg.get("kind") not in SEGMENT_KINDS:
            rep.err(sw, f"kind must be one of {sorted(SEGMENT_KINDS)}")
        if not str(seg.get("text", "")).strip():
            rep.err(sw, "empty text")
        cites = seg.get("cites", [])
        if seg.get("kind") in NEEDS_CITE and not cites:
            rep.err(sw, f"'{seg.get('kind')}' segments must cite at least one source")
        for c in cites:
            src = src_by_id.get(c.get("source"))
            if not src:
                rep.err(sw, f"cites unknown source '{c.get('source')}'")
            elif src.get("consulted"):
                consulted_cites += 1
    if not is_fixture and e.get("status") != "research-lead" and consulted_cites == 0:
        rep.err(where, "public entries need at least one citation to a source a PunePedia editor actually consulted")

    d = e.get("date")
    if d is not None:
        if not DATE_RE.match(str(d.get("start", ""))):
            rep.err(where, "date.start must be YYYY, YYYY-MM or YYYY-MM-DD")
        if d.get("end") is not None and not DATE_RE.match(str(d.get("end"))):
            rep.err(where, "date.end must be YYYY, YYYY-MM, YYYY-MM-DD or null")
        if d.get("precision") not in PRECISIONS:
            rep.err(where, f"date.precision must be one of {sorted(PRECISIONS)}")
        check_localized(rep, where, d.get("label"), kind="date.label")
        if d.get("end") and str(d["end"]) < str(d["start"])[: len(str(d["end"]))]:
            rep.err(where, "date.end is before date.start")
    elif e.get("timeline") and e.get("status") == "verified":
        rep.err(where, "verified timeline entries need a date (use status 'disputed' for undated questions)")

    loc = e.get("location")
    if loc is not None:
        lat, lng = loc.get("lat"), loc.get("lng")
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            rep.err(where, "location.lat/lng must be numbers")
        else:
            if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LNG_RANGE[0] <= lng <= LNG_RANGE[1]):
                rep.err(where, f"location {lat},{lng} is outside the Pune region box — check for a typo")
        if loc.get("status") not in LOCATION_STATUSES:
            rep.err(where, f"location.status must be one of {sorted(LOCATION_STATUSES)}")
        if loc.get("source") not in src_by_id:
            rep.err(where, "location.source must name a source in sources.json")
    for m in e.get("media", []):
        if not m.get("credit") or not m.get("license"):
            rep.err(where, "every media item needs 'credit' and 'license'")
        if m.get("asset") is None and m.get("placeholder") is None:
            rep.err(where, "media needs an 'asset' path")
        if m.get("asset") is not None and not (ROOT / m["asset"]).exists():
            rep.err(where, f"media asset not found: {m['asset']}")
    for r in e.get("related", []):
        if r not in all_ids:
            rep.err(where, f"related id '{r}' does not exist")
        if r == eid:
            rep.err(where, "entry lists itself as related")
    rv = e.get("review") or {}
    if rv.get("state") not in REVIEW_STATES:
        rep.err(where, f"review.state must be one of {sorted(REVIEW_STATES)}")
    if rv.get("state") == "reviewed" and not (rv.get("lastReviewed") and rv.get("reviewer")):
        rep.err(where, "reviewed entries need review.lastReviewed and review.reviewer")
    if not is_fixture:
        blob = json.dumps({k: e.get(k) for k in ("title", "summary", "body")}, ensure_ascii=False)
        if PLACEHOLDER_RE.search(blob):
            rep.err(where, "placeholder text found in a real entry")


def validate(include_fixtures: bool = False):
    rep = Report()
    taxonomy, sources, entries, fixtures = load_content(include_fixtures)
    src_by_id = check_sources(rep, sources)
    all_entries = entries + fixtures
    ids = [e.get("id") for e in all_entries]
    seen = set()
    for i in ids:
        if i in seen:
            rep.err("entries", f"duplicate id '{i}'")
        seen.add(i)
    for e in entries:
        check_entry(rep, e, taxonomy, src_by_id, seen, False)
    for e in fixtures:
        check_entry(rep, e, taxonomy, src_by_id, seen, True)
    for col in taxonomy.get("collections", []):
        for eid in col["entries"]:
            if eid not in seen:
                rep.err(f"taxonomy.json:{col['id']}", f"collection lists unknown entry '{eid}'")
    used = {c["source"] for e in all_entries for seg in (e["body"].get("en") or []) for c in seg.get("cites", [])}
    used |= {e["location"]["source"] for e in all_entries if e.get("location")}
    for s in sources:
        if s["id"] not in used and s.get("role") != "research-direction":
            rep.warn(f"sources.json:{s['id']}", "not cited by any entry")
    return rep, taxonomy, sources, entries, fixtures


def strip_private(e: dict) -> dict:
    return {k: v for k, v in e.items() if not k.startswith("_")}


def cmd_build(include_fixtures: bool) -> int:
    rep, taxonomy, sources, entries, fixtures = validate(include_fixtures)
    rep.print()
    if rep.errors:
        print("Build stopped: fix the errors above.")
        return 1
    meta = load_json(CONTENT / "meta.json")
    library = {
        "schemaVersion": SCHEMA_VERSION,
        "contentVersion": meta["contentVersion"],
        "contentDate": meta["contentDate"],
        "eras": taxonomy["eras"],
        "categories": taxonomy["categories"],
        "collections": taxonomy["collections"],
        "sources": sources,
        "entries": [strip_private(e) for e in entries],
    }
    ASSETS.mkdir(parents=True, exist_ok=True)
    (ASSETS / "library.json").write_text(json.dumps(library, ensure_ascii=False, indent=1), encoding="utf-8")
    fx = {"fixtures": [strip_private(e) for e in fixtures]}
    (ASSETS / "dev_fixtures.json").write_text(json.dumps(fx, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Wrote assets/content/library.json ({len(entries)} entries, {len(sources)} sources)")
    print(f"Wrote assets/content/dev_fixtures.json ({len(fixtures)} fixtures)")
    return 0


def cmd_release_check() -> int:
    rep, taxonomy, sources, entries, _ = validate(False)
    gate = Report()
    for e in entries:
        where = f"{e['_file']}:{e['id']}"
        if e["status"] == "research-lead":
            continue
        if e.get("review", {}).get("state") != "reviewed":
            gate.err(where, "not yet reviewed by an editor")
        loc = e.get("location")
        if loc and loc.get("status") != "verified":
            gate.err(where, "map location is sourced but not verified")
    built = ASSETS / "library.json"
    if not built.exists():
        gate.err("assets", "library.json missing — run build")
    else:
        lib = load_json(built)
        if lib.get("contentVersion") != load_json(CONTENT / "meta.json")["contentVersion"]:
            gate.err("assets", "library.json is stale — run build")
        if PLACEHOLDER_RE.search(json.dumps(lib["entries"], ensure_ascii=False)):
            gate.err("assets", "placeholder or fixture text in library.json")
    fx = ASSETS / "dev_fixtures.json"
    if fx.exists() and load_json(fx).get("fixtures"):
        gate.err("assets", "development fixtures are present — run build without --fixtures")
    cfg = (ROOT / "lib" / "config" / "app_config.dart").read_text(encoding="utf-8")
    model = cfg.split("purchaseModel =")[1].split(";")[0]
    if "PurchaseModel.undecided" in model:
        gate.err("lib/config/app_config.dart", "purchase model is still 'undecided'")
    if "PurchaseModel.freeWithUnlock" in model and not any(e.get("freeSample") for e in entries):
        gate.err("content/entries", "free download with unlock needs at least one freeSample entry")
    rep.print()
    print("\nRelease gate:")
    gate.print()
    return 1 if (rep.errors or gate.errors) else 0


def cmd_stats() -> int:
    rep, taxonomy, sources, entries, _ = validate(False)
    from collections import Counter
    st = Counter(e["status"] for e in entries)
    ty = Counter(e["type"] for e in entries)
    tl = [e for e in entries if e.get("timeline") and e["status"] != "research-lead"]
    places = [e for e in entries if e["type"] == "place"]
    mapped = [e for e in places if e.get("location")]
    reviewed = sum(1 for e in entries if e.get("review", {}).get("state") == "reviewed")
    free = [e["id"] for e in entries if e.get("freeSample")]
    consulted = sum(1 for s in sources if s.get("consulted"))
    print(f"Entries: {len(entries)}  by status: {dict(st)}  by type: {dict(ty)}")
    print(f"Public timeline entries: {len(tl)} (target 30)")
    print(f"Places: {len(places)} (target 25), with sourced coordinates: {len(mapped)}")
    print(f"Editor-reviewed: {reviewed}/{len(entries)}")
    print(f"Free samples: {len(free)} ({', '.join(free)})")
    print(f"Sources: {len(sources)} ({consulted} consulted directly)")
    return 0


def cmd_register() -> int:
    rep, taxonomy, sources, entries, _ = validate(False)
    cited = {}
    for e in entries:
        for seg in e["body"].get("en") or []:
            for c in seg.get("cites", []):
                cited.setdefault(c["source"], set()).add(e["id"])
        if e.get("location"):
            cited.setdefault(e["location"]["source"], set()).add(e["id"])
    lines = [
        "# PunePedia source register",
        "",
        "Generated by `python3 tools/content.py register` from `content/sources.json`. Do not edit by hand.",
        "",
        "**Consulted** means the source was actually read. For this starter set, 'consulted' sources were read by the build assistant through an automated page fetch that returns an extracted summary, not by a human editor. The entries built on them were signed off by the publisher on 2026-10-31. "
        "Sources marked *not yet read* are recorded because a consulted source cites them; they are leads, not checked evidence.",
        "",
        f"{len(sources)} sources · {sum(1 for s in sources if s.get('consulted'))} consulted directly.",
        "",
    ]
    groups = [("Consulted", True), ("Not yet read directly", False)]
    for heading, flag in groups:
        lines += [f"## {heading}", ""]
        for s in sorted((x for x in sources if bool(x.get("consulted")) == flag), key=lambda x: x["title"].lower()):
            via = f" Known through `{s['citedVia']}`." if s.get("citedVia") else ""
            used = ", ".join(sorted(cited.get(s["id"], []))) or "— (research direction)"
            lines += [
                f"### {s['title']}",
                f"- **ID:** `{s['id']}` · **Kind:** {s['kind']} · **Role:** {s.get('role', '')}",
                f"- **Bibliographic:** {s['author']}. *{s['title']}*. {s['publisher']}, {s['year']}.",
                f"- **Link:** {s['url']} (accessed {s['accessed']})",
                f"- **Evaluation:** {s['reliability']}{via}",
                f"- **Cited by:** {used}",
                "",
            ]
    out = ROOT / "docs" / "SOURCE_REGISTER.md"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {out.relative_to(ROOT)}")
    return 0


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(__doc__)
        return 2
    cmd = argv[1]
    if cmd == "validate":
        rep, *_ = validate("--fixtures" in argv)
        rep.print()
        return 1 if rep.errors else 0
    if cmd == "build":
        return cmd_build("--fixtures" in argv)
    if cmd == "release-check":
        return cmd_release_check()
    if cmd == "stats":
        return cmd_stats()
    if cmd == "register":
        return cmd_register()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
