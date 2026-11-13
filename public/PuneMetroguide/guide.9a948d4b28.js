// Pune Metro guide: progressive enhancement only. Everything on the page is readable without this file.
// It registers the offline service worker, shows the update note, tracks online state and filters the area list.
// The journey planner itself is the Gleam/Lustre bundle (planner.*.js), not this file.
const $ = (selector, root = document) => root.querySelector(selector);
// --- offline service worker, scoped to the guide only (relative URLs follow wherever the guide is served) ---
const banner = $('#metro-update');
function showUpdate(reg) {
    if (!banner)
        return;
    banner.hidden = false;
    const button = $('button', banner);
    if (button)
        button.onclick = () => { reg.waiting?.postMessage('skip-waiting'); };
}
if ('serviceWorker' in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading)
            return;
        reloading = true;
        location.reload();
    });
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller)
            showUpdate(reg);
        reg.addEventListener('updatefound', () => {
            const worker = reg.installing;
            if (!worker)
                return;
            worker.addEventListener('statechange', () => {
                if (worker.state === 'installed' && navigator.serviceWorker.controller)
                    showUpdate(reg);
            });
        });
        const ready = $('#metro-offline-ready');
        void navigator.serviceWorker.ready.then(() => {
            if (ready)
                ready.hidden = false;
            // The bare /PuneMetroguide URL is outside the worker's scope, so it can only redirect offline from the browser's HTTP cache.
            // Fetching it once while online keeps that redirect cached.
            const bare = location.pathname.replace(/\/$/, '');
            if (navigator.onLine && bare !== location.pathname)
                fetch(bare, { redirect: 'manual' }).catch(() => undefined);
        });
    }).catch(() => undefined);
}
// --- online / offline state (no live data is ever shown; this only explains which links need the network) ---
const net = $('#metro-net');
function syncOnline() {
    if (net)
        net.hidden = navigator.onLine;
    document.documentElement.classList.toggle('metro-offline', !navigator.onLine);
}
addEventListener('online', syncOnline);
addEventListener('offline', syncOnline);
syncOnline();
// --- area directory filter ---
const query = $('#area-q');
const areas = [...document.querySelectorAll('.area')];
const count = $('#area-count');
if (query) {
    query.addEventListener('input', () => {
        const term = query.value.trim().toLowerCase();
        let shown = 0;
        for (const area of areas) {
            const hit = !term || (area.textContent ?? '').toLowerCase().includes(term);
            area.hidden = !hit;
            if (hit)
                shown++;
        }
        if (count)
            count.textContent = term ? `${shown} of ${areas.length} areas match.` : '';
    });
}
export {};
