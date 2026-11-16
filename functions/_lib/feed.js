// Live Pune plan feed. Read-only, credential-free, no database and no paid service.
// Same fixed public District category pages and parsers as scripts/update-plans.mjs, fetched once each per cache miss.
// The edge cache holds the result for up to 4 hours: it refreshes when someone asks after that, not on a timer.
import { PUNE_SOURCES, parseDistrictPune } from '../../src/discovery.js';
import { istDate, normalizePuneEvents } from '../../src/events.js';
export const FEED_SOURCES = Object.freeze(PUNE_SOURCES.filter((s) => s.id.startsWith('District Pune')));
export const TTL_OK = 4 * 3600, TTL_PARTIAL = 10 * 60;
const restricted = (e) => /(students|members|alumni|employees)\s+only|invite[-\s]only|closed event|private event/i.test(e.title);
async function readSource(url, fetcher) {
  if (!FEED_SOURCES.some((s) => s.url === url)) throw new Error('not allowlisted');
  const r = await fetcher(url, { redirect: 'error', headers: { 'User-Agent': 'PeakPune/0.1 (public event discovery; source links retained)' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (!/text\/html/i.test(r.headers.get('content-type') || '')) throw new Error('content type');
  const text = await r.text();
  if (text.length > 3_000_000) throw new Error('too large');
  return text;
}
export async function collectFeed({ fetcher = fetch, now = new Date() } = {}) {
  const checkedAt = now.toISOString(), today = istDate(now);
  const results = await Promise.all(FEED_SOURCES.map(async (s) => {
    try {
      const parsed = parseDistrictPune(await readSource(s.url, fetcher));
      const rows = normalizePuneEvents(parsed.filter((e) => !restricted(e)), { today }).filter((e) => e.links.every((l) => new URL(l.url).hostname === 'www.district.in'));
      return { rows, status: { source: s.id, url: s.url, state: 'ok', count: rows.length, checkedAt } };
    } catch (e) { return { rows: [], status: { source: s.id, url: s.url, state: 'unavailable', reason: String(e?.message || e?.name || 'error').replace(/[^A-Za-z0-9 :._-]/g, '').slice(0, 60), count: 0, checkedAt } }; }
  }));
  const status = results.map((r) => r.status);
  const events = normalizePuneEvents(results.flatMap((r) => r.rows), { today }).map((e) => ({ ...e, checkedAt, verification: 'platform-listed; organiser details not independently confirmed' }));
  return { schemaVersion: 1, fetchedAt: checkedAt, expiresAt: new Date(+now + TTL_OK * 1000).toISOString(), timezone: 'Asia/Kolkata', events, status, partial: status.some((s) => s.state !== 'ok'), allDown: status.every((s) => s.state !== 'ok') };
}
const H = { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff' };
export async function feedResponse(request, { cache, fetcher, now } = {}) {
  cache ??= globalThis.caches?.default;
  const key = new Request(new URL('/api/feed', request.url).toString(), { method: 'GET' });
  const hit = cache && (await cache.match(key));
  if (hit) return hit;
  const feed = await collectFeed({ fetcher, now });
  // Nothing readable: never cache and never show an empty list as if it were fresh.
  // Remember the failure for 10 minutes so a blocked or down source is not retried on every visit.
  if (feed.allDown || !feed.events.length) {
    const fail = new Response(JSON.stringify({ error: 'sources unavailable', status: feed.status.map(({ source, state, reason }) => ({ source, state, reason })) }), { status: 503, headers: { ...H, 'cache-control': `public, max-age=${TTL_PARTIAL}, s-maxage=${TTL_PARTIAL}` } });
    if (cache) await cache.put(key, fail.clone());
    return fail;
  }
  const { allDown, ...body } = feed;
  const ttl = feed.partial ? TTL_PARTIAL : TTL_OK;
  if (feed.partial) body.expiresAt = new Date(+new Date(feed.fetchedAt) + TTL_PARTIAL * 1000).toISOString();
  const res = new Response(JSON.stringify(body), { headers: { ...H, 'cache-control': `public, max-age=${ttl}, s-maxage=${ttl}` } });
  if (cache) await cache.put(key, res.clone());
  return res;
}
