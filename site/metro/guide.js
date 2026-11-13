// Pune Metro guide: progressive enhancement only. Everything on the page is readable without this file.
// It registers the offline service worker, shows the update note, tracks online state and filters the area list.
// The journey planner itself is the Gleam/Lustre bundle (planner.*.js), not this file.
const $ = (s, r = document) => r.querySelector(s);

// --- offline service worker, scoped to the guide only (relative URLs follow wherever the guide is served) ---
const banner = $('#metro-update');
const showUpdate = (reg) => { if (!banner) return; banner.hidden = false; $('button', banner).onclick = () => { if (reg.waiting) reg.waiting.postMessage('skip-waiting'); }; };
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadController || reloading) return; reloading = true; location.reload(); });
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(reg); });
    });
    const ready = $('#metro-offline-ready');
    navigator.serviceWorker.ready.then(() => {
      if (ready) ready.hidden = false;
      // The bare /PuneMetroguide URL is outside the worker's scope, so it can only redirect offline from the browser's HTTP cache.
      // Fetching it once while online keeps that redirect cached.
      const bare = location.pathname.replace(/\/$/, '');
      if (navigator.onLine && bare !== location.pathname) fetch(bare, { redirect: 'manual' }).catch(() => {});
    });
  }).catch(() => {});
}

// --- online / offline state (no live data is ever shown; this only explains which links need the network) ---
const net = $('#metro-net');
const sync = () => { if (net) net.hidden = navigator.onLine; document.documentElement.classList.toggle('metro-offline', !navigator.onLine); };
addEventListener('online', sync); addEventListener('offline', sync); sync();

// --- area directory filter ---
const q = $('#area-q'), areas = [...document.querySelectorAll('.area')], status = $('#area-count');
if (q) {
  const run = () => {
    const t = q.value.trim().toLowerCase(); let n = 0;
    for (const a of areas) { const hit = !t || a.textContent.toLowerCase().includes(t); a.hidden = !hit; if (hit) n++; }
    if (status) status.textContent = t ? `${n} of ${areas.length} areas match.` : '';
  };
  q.addEventListener('input', run);
}
