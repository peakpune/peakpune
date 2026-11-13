<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Plan } from '../client/types.js';
  import { sharePlan } from '../client/share.js';
  let { plan }: { plan: Plan } = $props();
  let label = $state('Share');
  let timer: ReturnType<typeof setTimeout> | undefined;
  onDestroy(() => clearTimeout(timer));
  async function share() {
    const link = plan.links[0];
    if (!link) return;
    const result = await sharePlan({ title: plan.title, url: link.url });
    const messages: Record<string, string> = {copied: 'Link copied', failed: 'Could not copy', unavailable: 'Sharing not available'};
    label = messages[result] ?? 'Share';
    clearTimeout(timer);
    timer = setTimeout(() => label = 'Share', 1800);
  }
</script>
<article class="card plan-card"><div class="inner">
  <span class="eyebrow">{plan.date}</span><h3>{plan.title}</h3><p>{plan.place || 'Venue: check source'}</p>
  <div class="plan-actions"><a class="chip" href={plan.links[0]?.url} target="_blank" rel="noopener noreferrer">View current details</a><button class="chip" type="button" aria-label={'Share ' + plan.title} onclick={share}>{label}</button></div>
  <p class="note">District-listed · Not organiser-confirmed</p>
</div></article>
