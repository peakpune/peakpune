// Home page "Pune right now" strip. Progressive enhancement: the section stays hidden until data arrives.
// The visitor's browser asks Open-Meteo directly (no key, no Peak Pune server); nothing is stored.
import { airUrl, buildView, forecastUrl, type View } from './pune-now-model.js';

const root = document.querySelector<HTMLElement>('#pune-now');

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const cell = (title: string, value: string, detail?: string, tone?: string): HTMLElement => {
  const el = document.createElement('div');
  el.className = 'now-cell' + (tone ? ` tone-${tone}` : '');
  const h = document.createElement('h3');
  h.textContent = title;
  const v = document.createElement('p');
  v.className = 'now-value';
  v.textContent = value;
  el.append(h, v);
  if (detail) {
    const d = document.createElement('p');
    d.className = 'note';
    d.textContent = detail;
    el.append(d);
  }
  return el;
};

function render(view: View, host: HTMLElement): void {
  const grid = host.querySelector<HTMLElement>('.now-grid');
  if (!grid) return;
  const cells: HTMLElement[] = [];
  cells.push(view.air
    ? cell('Air quality', `AQI ${view.air.value}`, `${view.air.label} (US AQI)${view.air.pm25 !== null ? ` · PM2.5 ${Math.round(view.air.pm25)} µg/m³` : ''}`, view.air.tone)
    : cell('Air quality', 'Unavailable', 'The air-quality service did not answer.'));
  cells.push(view.next
    ? cell('Next hour', `${Math.round(view.next.temp)}°C at ${view.next.at}`, [view.now ? `Now ${Math.round(view.now.temp)}°C` : null, view.next.rain !== null ? `${Math.round(view.next.rain)}% chance of rain` : null].filter(Boolean).join(' · ') || undefined)
    : cell('Next hour', 'Unavailable', 'The forecast service did not answer.'));
  cells.push(view.sun
    ? cell('Sun', `↑ ${view.sun.rise}  ↓ ${view.sun.set}`, `Daylight ${view.sun.daylight}`)
    : cell('Sun', 'Unavailable', 'Sunrise and sunset were not returned.'));
  cells.push(cell('Moon', `↑ ${view.moon.rise ?? 'none today'}  ↓ ${view.moon.set ?? 'none today'}`, `${view.moon.phase}, ${view.moon.lit}% lit · times approx.`));
  grid.replaceChildren(...cells);
  host.hidden = false;
}

async function load(host: HTMLElement): Promise<void> {
  const [forecast, air] = await Promise.allSettled([getJson(forecastUrl()), getJson(airUrl())]);
  const view = buildView(forecast.status === 'fulfilled' ? forecast.value : null, air.status === 'fulfilled' ? air.value : null, new Date());
  // Nothing from either service: leave the strip hidden rather than show a wall of "unavailable".
  if (forecast.status === 'rejected' && air.status === 'rejected') return;
  render(view, host);
}

if (root) {
  void load(root);
  // Refresh while the tab stays open and visible.
  setInterval(() => { if (document.visibilityState === 'visible') void load(root); }, 15 * 60_000);
}
