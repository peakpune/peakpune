# peakpune_metro: the journey planner

A small [Gleam](https://gleam.run) program, compiled to JavaScript, using [Lustre](https://github.com/lustre-labs/lustre).
It mounts on `#metro-planner` in `/PuneMetroguide/` and answers: which line(s), which direction, how many stops, where to
change, and what the ticket costs, for any two stations. It derives all of that from the data in `data/metro/`, runs
entirely in the browser and needs no network.

```
src/peakpune_metro.gleam            Lustre app (view and messages)
src/peakpune_metro/planner.gleam    routing, interchange derivation, fare lookup
src/peakpune_metro/types.gleam      typed network model
src/peakpune_metro/ids.gleam        GENERATED: StationId and LineId types
src/peakpune_metro/data.gleam       GENERATED: the network, from data/metro/*.json
test/peakpune_metro_test.gleam      routing, interchange, fares (incl. missing and disputed), closed stations
entry.mjs                           esbuild entry: starts the app, hides the no-JavaScript fallback
dist/planner.js                     the committed bundle that ships (built, not hand-written)
```

Station ids are constructors of a custom type, so a reference to an unknown station is a compile error, and a `case`
that forgets a line or a status does not compile. Types cannot prove a real-world fare or status is right: the data
carries `verified_on`, a source and a `verified` flag for that, and the planner only offers a station when the operator
has confirmed it open.

## Build

```sh
npm run metro:data     # regenerate ids.gleam and data.gleam from the JSON
npm run metro:test     # gleam test (needs gleam and node)
npm run metro:build    # gleam build --target javascript, then esbuild -> dist/planner.js
npm run build && npm test
```

`lustre_dev_tools` is listed as a dev dependency, but it needs Erlang to run, so the bundle step uses esbuild directly
(pinned in `scripts/metro-build.mjs`). Deploys do not compile anything: commit `dist/planner.js`.

## Status of this branch

The Gleam sources and tests were written against the published gleam_stdlib 1.0.5 and lustre 5.7.1 sources, but the
Gleam compiler could not be installed in the environment that produced them, so **they have not been compiled or run**.
Until `npm run metro:build` succeeds and `npm run metro:test` passes, treat the planner as unproven. The test
`the Gleam planner bundle is built, committed and referenced by the guide` fails until the bundle exists.
