# /map/ assets

- `maplibre-gl.js`, `maplibre-gl.css`: MapLibre GL JS 5.13.0 (BSD-3-Clause), from the
  `maplibre-gl` npm package (devDependency). Loaded only on `/map/`.
- `style.json`: MapLibre style derived from the OpenFreeMap "liberty" style
  (https://tiles.openfreemap.org/styles/liberty), recoloured to the Peak Pune brand kit.
  Vector tiles: OpenMapTiles schema served by OpenFreeMap (`https://tiles.openfreemap.org/planet`),
  data © OpenStreetMap contributors (ODbL). Glyphs and sprites come from OpenFreeMap's public CDN.
  OpenFreeMap is free for production use without an API key (https://openfreemap.org/tos/);
  no tile content is bulk-downloaded or mirrored.
- `map.js`: pins and category filters. Reads its data from the `#map-data` script tag that
  `scripts/build.mjs` embeds in the page. The page works without JavaScript (plain list).
