// Progressive enhancement only: every page is complete static HTML without this file.
const $ = (s) => document.querySelector(s);
const node = (tag, text, cls) => { const e = document.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };

// Old hash links (#/events) now have real URLs.
const legacy = { events: '/events/', meetups: '/meetups/', moments: '/moments/', 'powered-by': '/powered-by/' }[location.hash.replace(/^#\/?/, '')];
if (legacy && location.pathname === '/') location.replace(legacy);

const categories = [['Places', '/places/'], ['Events', '/events/'], ['Parties and nightlife', '/events/'], ['Meetups', '/meetups/'], ['Runs, rides and sports', '/powered-by/'], ['Food and chai', '/places/#cafe'], ['Music and gigs', '/events/'], ['Trails and day trips', '/powered-by/'], ['Peak Pune moments', '/moments/']];
const areas = ['Koregaon Park', 'Baner', 'Kothrud', 'Kharadi', 'Viman Nagar', 'Hinjewadi', 'Camp', 'Aundh', 'Shivajinagar', 'Peth area', 'Wakad', 'Hadapsar'];
function categoryCard(title, href) {
  const e = node(href ? 'a' : 'article', null, 'category');
  if (href) e.href = href;
  e.append(node('span', 'BROWSE', 'eyebrow'), node('h3', title));
  return e;
}

const categoryGrid = $('#categories');
if (categoryGrid) {
  categories.forEach(([t, h]) => categoryGrid.append(categoryCard(t, h)));
  $('#search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = $('#search').value.trim().toLocaleLowerCase();
    let n = 0;
    [...categoryGrid.children].forEach((c) => { c.hidden = !c.textContent.toLocaleLowerCase().includes(q); if (!c.hidden) n++; });
    $('#search-status').textContent = `${n} matching categories. Live event search is not connected.`;
  });
}
const communities = $('#communities');
if (communities) ['Runs and rides', 'Books', 'Tech', 'Board games', 'Trekking', 'Music'].forEach((x) => communities.append(categoryCard(x)));
const areaRow = $('#areas');
if (areaRow) areas.forEach((area) => {
  const b = node('button', area, 'chip'); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => {
    areaRow.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    $('#area-status').textContent = `${area} selected for layout review. No live listings are connected.`;
  });
  areaRow.append(b);
});
const moments = $('#moments');
if (moments) [['PATYA', '"No parking. Yes, you. Also you."'], ['TRAFFIC', 'Rickshaw takes the one-way the other way, with full confidence'], ['FOOD', 'The misal vs. sabudana khichdi argument, round 4,000']].forEach(([cat, title]) => {
  const e = node('article', null, 'card'); e.append(node('div', 'PHOTO GOES HERE', 'placeholder'));
  const inner = node('div', null, 'inner'); inner.append(node('span', cat, 'eyebrow'), node('h3', title), node('p', 'Brand-kit example · No contributor attached'));
  e.append(inner); moments.append(e);
});

const dialog = $('#submission');
if (dialog) {
  document.querySelectorAll('[data-action="submission"]').forEach((b) => b.addEventListener('click', () => { dialog.hidden = false; dialog.scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
  $('#close-dialog').addEventListener('click', () => { dialog.hidden = true; });
}
