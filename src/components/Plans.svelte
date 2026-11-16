<script lang="ts">
  import { onMount } from 'svelte';
  import { isWeekend, istDate, inRange, RANGES, rangeOf, type RangeKey } from '../client/filters.js';
  import { parseSnapshot, nextRefreshAt } from '../client/snapshot.js';
  import type { Plan } from '../client/types.js';
  import PlanCard from './PlanCard.svelte';
  let { mode, snapshotUrl }: { mode: 'all' | 'weekend'; snapshotUrl: string } = $props();
  let rows = $state<Plan[]>([]), today = $state(''), range = $state<RangeKey | null>(null);
  let status = $state('Loading source-listed plans...'), health = $state('');
  let loadState = $state<'loading' | 'ready' | 'failed'>('loading');
  const weekend = $derived(today ? rows.filter(e => isWeekend(e, today)) : []);
  const shown = $derived(mode === 'weekend' ? weekend.slice(0, 6) : range && today ? rows.filter(e => inRange(e, range!, today)) : rows);
  const rangeLabel = $derived(range && today ? (() => { const r = rangeOf(range, today); return `${r.from} to ${r.to}`; })() : '');
  const latest = $derived(rows.length ? rows.map(e => e.date).sort().slice(-1)[0] : '');
  onMount(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const controller = new AbortController();
    async function load() {
      clearTimeout(timer);
      // Never leave stale cards visible during an expiry or midnight refresh.
      rows = [];
      try {
        // Live source check first (a Pages Function, cached for up to 4 hours at the edge); the committed snapshot is the fallback.
        let live = true, snapshot;
        try {
          const response = await fetch('/api/feed', {signal: controller.signal});
          if (!response.ok) throw new Error('Unavailable');
          snapshot = parseSnapshot(await response.json());
        } catch {
          live = false;
          const response = await fetch(snapshotUrl, {cache: 'no-cache', signal: controller.signal});
          if (!response.ok) throw new Error('Unavailable');
          snapshot = parseSnapshot(await response.json());
        }
        if (disposed) return;
        today = istDate(); rows = snapshot.events; loadState = 'ready';
        const format = (n: number) => new Date(n).toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
        status = rows.length ? (live ? `${rows.length} source-listed Pune plans. Sources last read ${format(snapshot.fetchedAt)} IST. Re-read when someone opens this page, at most every 4 hours; it is not a timed job. Past dates are hidden.` : `${rows.length} source-listed Pune plans. Checked ${format(snapshot.fetchedAt)} IST. Saved copy, because the live source check was unavailable; it expires ${format(snapshot.expiresAt)} IST. Past dates hidden daily.`) : 'No upcoming source-listed plans right now.';
        health = `District: ${snapshot.status.filter(s => s.state === 'ok').length}/${snapshot.status.length} category pages available at check. Meetup and Reddit feeds are not connected.`;
        timer = setTimeout(load, nextRefreshAt(snapshot));
      } catch {
        if (disposed) return;
        rows = []; loadState = 'failed';
        status = 'Plans need a fresh source check. Nothing outdated is shown.';
        health = 'The snapshot is unavailable or older than 24 hours. No live availability is promised.';
      }
    }
    void load();
    return () => {disposed = true; controller.abort(); clearTimeout(timer);};
  });
</script>
{#if mode === 'all'}
  <section class="feed-status"><h2>Plans, with sources.</h2><p>Platform listings, not independently confirmed by the organiser. Check current dates, prices, availability and cancellation terms before booking.</p>
    <p id="plans-status" role="status">{status}</p>
    <div class="chips" id="plan-filters" role="group" aria-label="Filter plans">{#each RANGES as r}<button class="chip" data-filter={r.key} aria-pressed={range === r.key} onclick={() => range = range === r.key ? null : r.key}>{r.label}</button>{/each}</div>
    <p class="note" id="filter-status" role="status">{range && loadState === 'ready' ? `${shown.length} of ${rows.length} plans match (${rangeLabel}). Filter uses only the listed date.${shown.length === 0 ? ' Nothing is listed for that window in the sources yet.' : ''}` : ''}</p><p class="note" id="plans-health">{health}{#if latest} Listings in this check run to {latest}; later events are not covered yet.{/if}</p>
    <noscript><p class="note">JavaScript is needed for the dated snapshot and filter. The source calendars and organiser listings below remain available.</p></noscript>
  </section>
{/if}
<div class="grid" id={mode === 'weekend' ? 'weekend-plans' : 'plans'}>
  {#each shown as plan}<PlanCard {plan} />{/each}
  {#if mode === 'weekend'}
    {#if loadState === 'loading'}<p class="note">Loading source-listed plans...</p>
    {:else if loadState === 'failed'}<p class="note">{status}</p>
    {:else if !weekend.length}<p class="note">No source-listed plans for this weekend in the current snapshot.</p>
    {:else if weekend.length > 6}<p class="note">Showing 6 of {weekend.length} weekend plans. Open Events and tap This weekend for all.</p>{/if}
    <noscript><p class="note">Open Events for source calendars and organiser listings. The dated snapshot needs JavaScript.</p></noscript>
  {/if}
</div>
