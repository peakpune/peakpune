// /eastpune/: OpenStreetMap venues on the Peak Pune map style.
// Progressive enhancement only: the page and its full place list work without this file.
const statusEl = document.getElementById('map-status');
const fallbackEl = document.getElementById('map-fallback');
const dataEl = document.getElementById('map-data');
const filtersEl = document.getElementById('map-filters');

const fail = (msg) => { if (statusEl) statusEl.textContent = msg; };

const popupFor = (p) => {
  const node = document.createElement('div');
  node.className = 'map-pop';
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = p.neighbourhood ? `${p.label} · ${p.neighbourhood}` : p.label;
  const name = document.createElement('h3');
  name.textContent = p.name;
  const summary = document.createElement('p');
  summary.textContent = p.summary;
  const link = document.createElement('a');
  link.className = 'chip';
  link.href = p.href;
  link.textContent = 'View on OpenStreetMap';
  link.rel = 'noopener nofollow';
  node.append(eyebrow, name, summary);
  if (p.guide) {
    const more = document.createElement('a');
    more.className = 'chip';
    more.href = `#${p.guide}`;
    more.textContent = 'Read more on this page';
    node.append(more);
  }
  node.append(link);
  return new maplibregl.Popup({ offset: 16, maxWidth: '260px' }).setDOMContent(node);
};

const boot = () => {
  if (!window.maplibregl) return fail('The map library did not load. Every place is listed below.');
  const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
  if (!gl) return fail('This browser cannot draw the map (WebGL is unavailable). Every place is listed below.');
  let places;
  try { places = JSON.parse(dataEl.textContent); } catch { return fail('The place data did not load. Every place is listed below.'); }
  if (!Array.isArray(places) || !places.length) return fail('No pinned places yet. Every place is listed below.');

  const base = new URL('.', import.meta.url).pathname;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const map = new maplibregl.Map({
    container: 'ep-map',
    style: '/map/style.json',
    center: [73.9225, 18.5495],
    zoom: 12.6,
    minZoom: 12,
    maxBounds: [[73.87, 18.49], [73.98, 18.60]],
    attributionControl: { compact: false },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.scrollZoom.disable();
  map.on('error', () => fail('Some map detail could not load. Pins and the list below still work.'));

  const pins = [];
  map.on('load', () => {
    fallbackEl.hidden = true;
    for (const p of places) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'map-pin';
      el.dataset.type = p.type;
      el.setAttribute('aria-label', p.neighbourhood ? `${p.name}, ${p.label}, ${p.neighbourhood}` : `${p.name}, ${p.label}`);
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lon, p.lat]).setPopup(popupFor(p)).addTo(map);
      marker.getPopup().on('open', () => map[reduced ? 'jumpTo' : 'easeTo']({ center: [p.lon, p.lat], offset: [0, 130], duration: 400 }));
      pins.push({ p, el, marker });
    }
    if (statusEl) statusEl.textContent = 'Drag to move. Tap the map once, then scroll or pinch to zoom.';
    enableScrollZoomOnFocus();
    openFromHash();
  });

  // Keep page scroll natural on touch: zoom engages once the map has focus or a tap.
  const enableScrollZoomOnFocus = () => {
    const on = () => map.scrollZoom.enable();
    map.getCanvasContainer().addEventListener('pointerdown', on, { once: true });
    map.getCanvas().addEventListener('focus', on, { once: true });
  };

  const openFromHash = () => {
    const slug = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!slug) return;
    const hit = pins.find(({ p }) => p.id === slug);
    if (!hit) return;
    map[reduced ? 'jumpTo' : 'flyTo']({ center: [hit.p.lon, hit.p.lat], zoom: Math.max(map.getZoom(), 14) });
    hit.marker.togglePopup();
  };

  // Category chips toggle their pins. All categories start on.
  filtersEl?.addEventListener('click', (e) => {
    const chip = e.target.closest('button[data-type]');
    if (!chip) return;
    const pressed = chip.getAttribute('aria-pressed') === 'true';
    chip.setAttribute('aria-pressed', String(!pressed));
    const off = new Set([...filtersEl.querySelectorAll('button[data-type]')].filter((b) => b.getAttribute('aria-pressed') !== 'true').map((b) => b.dataset.type));
    for (const { p, el, marker } of pins) {
      el.hidden = off.has(p.type);
      if (el.hidden && marker.getPopup()?.isOpen()) marker.getPopup().remove();
    }
  });
};

boot();
