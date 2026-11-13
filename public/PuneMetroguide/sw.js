// Pune Metro guide service worker. Registered with scope /PuneMetroguide/ only.
// It serves the guide's own files from a versioned cache so the guide and planner work offline.
// It never handles a request that is not in its precache list, so nothing else on the site is touched.
const CACHE = 'pp-metro-13e95df8a7';
const PRECACHE = [
 "/PuneMetroguide/",
 "/icon.svg",
 "/site.webmanifest",
 "/fonts/fraunces.ttf",
 "/tokens.css?v=93b928b754e6",
 "/PuneMetroguide/metro.840b63bc48.css",
 "/app.js?v=deaecbfcd260",
 "/PuneMetroguide/guide.9a948d4b28.js",
 "/PuneMetroguide/planner.c00ee9cc3a.js",
 "/fonts/inter.ttf"
];
const GUIDE = '/PuneMetroguide/';
const listed = new Set(PRECACHE);

self.addEventListener('install', (event) => {
  // No skipWaiting here: a new version waits until the visitor taps "refresh" on the page,
  // so cached fares are never swapped for new ones silently.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((u) => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('message', (event) => { if (event.data === 'skip-waiting') self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('pp-metro-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isGuidePage = url.pathname === GUIDE || url.pathname === GUIDE + 'index.html';
  const key = isGuidePage ? GUIDE : url.pathname + url.search;
  if (!isGuidePage && !listed.has(key)) return; // not ours: let the browser handle it
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key);
    if (hit) return hit;
    try { return await fetch(req); } catch { return Response.error(); }
  })());
});
