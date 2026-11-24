#!/usr/bin/env bash
# Regenerates the /sky/ page fragment and its data. Run from the repository root.
# Usage: scripts/sky/generate.sh [YYYY-MM-DD]   (default: today in IST)
# Needs: python3, pip install -r scripts/sky/requirements.txt. The first run downloads the
# 32 MB NASA JPL DE440s ephemeris into scripts/sky/.cache (git-ignored).
set -euo pipefail
TODAY="${1:-$(TZ=Asia/Kolkata date +%F)}"
END="$(python3 - "$TODAY" <<'PY'
import sys,calendar
y,m,d=[int(x) for x in sys.argv[1].split('-')]
m+=15; y+=(m-1)//12; m=(m-1)%12+1
print(f'{y}-{m:02d}-{calendar.monthrange(y,m)[1]:02d}')
PY
)"
TMP="$(mktemp -d)"
python3 scripts/sky/calc.py --start "$TODAY" --end "$END" --out data/sky/events.json
python3 scripts/sky/stars.py "${TODAY%%-*}" "$TMP/stars.json" data/sky/bright-stars.json
python3 scripts/sky/render.py --events data/sky/events.json --stars "$TMP/stars.json" --today "$TODAY" --out site/pages/sky.html
rm -rf "$TMP"
