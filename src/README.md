# src/

Hand-written application code for the browser and the Astro build.

| Path | What | Notes |
| --- | --- | --- |
| `client/` | Strict TypeScript: publication gate, snapshot and URL boundaries, dates, share, **Pune right now** (`pune-now*.ts`, `astro.ts`), metro guide script. | Compiled by `tsc` into `public/lib/`. |
| `components/` | `Plans.svelte`, `PlanCard.svelte`: the only hydrated Svelte island (home and Events). | |
| `pages/`, `layouts/` | Astro static routes and the shared document layout. | The reviewed renderer in `scripts/build.mjs` supplies the content. |
| `events.js`, `discovery.js` | Event ingestion validation and source parsers. Offline by default. | Used by the manual plans export. |
| `abuse-guard.js` | Dormant helpers (honeypot, per-IP limit, entry cap) for a future form backend. | Connected to nothing; protects nothing today. |

Check types with `npm run check`.
