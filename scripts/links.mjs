// Off-site links open in a new tab, safely. Applied to every generated page at build time, so new links
// added to data or site fragments get it automatically. Links to peakpune.com itself stay in the same tab.

const OWN_HOSTS = ['peakpune.com'];

/** True for an absolute http(s) URL that leaves the site. Malformed or relative URLs are left alone. */
export function isExternal(href) {
  let url;
  try { url = new URL(href.replaceAll('&amp;', '&')); } catch { return false; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
  return !OWN_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

/** Adds target="_blank" and rel="noopener noreferrer" to one <a> tag, keeping any rel values already set. */
export function newTabAnchor(tag) {
  const href = tag.match(/\shref="([^"]*)"/);
  if (!href || !isExternal(href[1])) return tag;
  if (/\starget=/i.test(tag)) return tag; // an explicit target from the author wins
  const rel = tag.match(/\srel="([^"]*)"/);
  const tokens = rel ? rel[1].split(/\s+/).filter(Boolean) : [];
  for (const t of ['noopener', 'noreferrer']) if (!tokens.includes(t)) tokens.push(t);
  // Attributes are added at the end of the tag so everything already there keeps its position.
  const withoutRel = rel ? tag.replace(/\srel="[^"]*"/, '') : tag;
  return withoutRel.replace(/\s*(\/?)>$/, (_m, slash) => ` rel="${tokens.join(' ')}" target="_blank"${slash ? ' /' : ''}>`);
}

/** Rewrites every off-site anchor in a page's HTML. */
export function openExternalLinksInNewTab(html) {
  return html.replace(/<a\b[^>]*>/gi, newTabAnchor);
}
