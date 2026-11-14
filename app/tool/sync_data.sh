#!/usr/bin/env bash
# Copies the repository's data files into the app's bundled assets.
# Run from app/ after editing anything under ../data, then run `flutter test`
# (test/data_sync_test.dart fails while the copies are stale).
set -euo pipefail
cd "$(dirname "$0")/.."
src=../data
dst=assets/data
mkdir -p "$dst"
cp "$src/publication-audit.json" "$dst/"
cp "$src/batch-1-places/places.json" "$dst/"
cp "$src/batch-2-outdoors/outdoors.json" "$dst/"
cp "$src/batch-3-events/events.json" "$dst/"
cp "$src/batch-4-meetups/meetups.json" "$dst/"
cp "$src/metro/metro.json" "$src/metro/areas.json" "$dst/"
# New sections: copied when they exist in ../data.
for f in history.json shopping.json; do
  if [ -f "$src/$f" ]; then cp "$src/$f" "$dst/"; fi
done
echo "Synced $(ls "$dst" | wc -l) data files into $dst"
