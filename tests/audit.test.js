import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const graph = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
const sitemap = read('public/sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('sitemap holds only evergreen URLs: no dated snapshots, no empty or noindex pages', () => {
  assert.ok(locs.length > 50);
  for (const u of locs) assert.ok(!/\d{4}-\d{2}-\d{2}/.test(u), u);
  assert.ok(!locs.some((u) => u.includes('/moments/')));
  assert.ok(locs.includes('https://peakpune.com/about/'));
  for (const u of locs) {
    const file = 'public' + new URL(u).pathname + 'index.html';
    assert.ok(existsSync(file), file);
    assert.ok(!/<meta name="robots" content="noindex/.test(read(file)), `${u} is in the sitemap but noindex`);
  }
});

test('the empty Moments page is noindex and out of the navigation', () => {
  assert.match(read('public/moments/index.html'), /<meta name="robots" content="noindex,follow">/);
  const home = read('public/index.html');
  assert.ok(!/<nav aria-label="Main navigation">.*?moments.*?<\/nav>/s.test(home));
  assert.ok(!home.includes('href="/moments/"'));
});

test('/about/ exists, is linked from the navigation and carries AboutPage markup without naming anyone', () => {
  const about = read('public/about/index.html');
  assert.match(read('public/index.html'), /<nav aria-label="Main navigation">.*?href="\/about\/".*?<\/nav>/s);
  const g = graph(about);
  const page = g.find((n) => n['@type'] === 'AboutPage');
  assert.equal(page.about['@id'], 'https://peakpune.com/#org');
  assert.ok(g.some((n) => n['@type'] === 'BreadcrumbList'));
  assert.match(about, /We do not organise runs or treks/);
  assert.ok(!g.some((n) => n['@type'] === 'Person'), 'no author is invented');
});

test('Organization markup defines the entity and the area served', () => {
  const org = graph(read('public/index.html')).find((n) => n['@type'] === 'Organization');
  assert.match(org.description, /^Peak Pune is Pune's unofficial guide to doing interesting shit/);
  assert.match(org.description, /do not organise runs or treks/);
  assert.deepEqual([org.areaServed['@type'], org.areaServed.name], ['City', 'Pune']);
});

test('home FAQ: every marked-up answer is visible on the page word for word', () => {
  const home = read('public/index.html');
  const faq = graph(home).find((n) => n['@type'] === 'FAQPage');
  assert.ok(faq.mainEntity.length >= 5);
  const text = home.replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  for (const q of faq.mainEntity) {
    assert.ok(text.includes(`<h3>${q.name}</h3>`), q.name);
    assert.ok(text.includes(q.acceptedAnswer.text), q.name);
  }
  assert.ok(!/best places/i.test(JSON.stringify(faq)), 'no unsupported "best" claims');
});

test('place pages keep their type, address and breadcrumb markup', () => {
  const g = graph(read('public/places/raja-dinkar-kelkar-museum/index.html'));
  assert.ok(g.some((n) => n['@type'] === 'Museum' && n.address));
  assert.ok(g.some((n) => n['@type'] === 'BreadcrumbList'));
});

test('dated listings carry a freshness marker with the right limit', () => {
  assert.match(read('public/places/raja-dinkar-kelkar-museum/index.html'), /<p class="stale" data-checked="\d{4}-\d{2}-\d{2}" data-max-age="30" hidden><\/p>/);
  const eventsHtml = read('public/events/index.html');
  // The marker belongs to the dated list; it is absent when every event has ended.
  if (/href="\/calendar\/event-/.test(eventsHtml)) assert.match(eventsHtml, /<p class="stale" data-checked="\d{4}-\d{2}-\d{2}" data-max-age="7" hidden><\/p>/);
  assert.match(read('public/app.js'), /\.stale\[data-checked\]/);
});

test('fonts are subset WOFF2 and nothing still points at the old files', () => {
  const css = read('public/tokens.css');
  assert.match(css, /fonts\/fraunces\.woff2/); assert.match(css, /fonts\/inter\.woff2/); assert.match(css, /font-display:swap/);
  assert.ok(!css.includes('.ttf') && !read('public/index.html').includes('.ttf'));
  assert.ok(existsSync('public/fonts/fraunces.woff2') && !existsSync('public/fonts/fraunces.ttf'));
});

test('no node_modules entry is tracked by mistake', () => {
  assert.match(read('.gitignore'), /^node_modules$/m);
});

test('robots.txt allows AI crawlers and DuckDuckBot by name and still keeps /backend out for every group', () => {
  const robots = read('public/robots.txt');
  for (const agent of ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'DuckAssistBot', 'DuckDuckBot']) assert.match(robots, new RegExp(`^User-agent: ${agent}$`, 'm'), agent);
  const groups = robots.split(/\n\n/).filter((g) => /^(# .*\n)?User-agent:/.test(g));
  assert.equal(groups.length, 3);
  for (const g of groups) { assert.match(g, /^Allow: \/$/m); assert.match(g, /^Disallow: \/backend$/m); assert.ok(!/^Disallow: \/$/m.test(g), 'nothing is blocked site-wide'); }
  assert.match(robots, /^Sitemap: https:\/\/peakpune\.com\/sitemap\.xml$/m);
});

test('places and outdoors hubs: question headings, and every FAQ answer is visible word for word', () => {
  for (const [file, heading] of [['public/places/index.html', 'Which part of Pune are you in?'], ['public/outdoors/index.html', 'Where can I run in Pune?']]) {
    const html = read(file);
    const text = html.replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    assert.ok(text.includes(`<h2>${heading}</h2>`), heading);
    const faq = graph(html).find((n) => n['@type'] === 'FAQPage');
    assert.ok(faq.mainEntity.length >= 5, file);
    for (const q of faq.mainEntity) {
      assert.ok(q.name.endsWith('?'));
      assert.ok(text.includes(`<h3>${q.name}</h3>`), q.name);
      assert.ok(text.includes(q.acceptedAnswer.text), q.name);
    }
    assert.ok(graph(html).some((n) => n['@type'] === 'ItemList'), 'the list markup is still there');
  }
  const out = read('public/outdoors/index.html');
  assert.match(out, /id="runs"/); assert.match(out, /id="treks"/);
  assert.match(out, /Peak Pune does not organise runs, treks or trips/);
});
