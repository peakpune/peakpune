// Makes one 1200x630 share image per page into public/og/, in the Peak Pune brand (Fraunces, Peth Paper, Wada Brick, Haldi).
// Dev-only: needs Google Chrome on PATH as google-chrome. The generated PNGs are committed, so CI and Cloudflare never run this.
//   node scripts/og/generate.mjs
import { build, ogSlug } from '../build.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = process.cwd();
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pages = [];
build({ dryRun: true, onPage: (path, html) => {
  const title = (html.match(/<title>(.*?)<\/title>/s) || [])[1] || '';
  const desc = (html.match(/<meta name="description" content="(.*?)">/s) || [])[1] || '';
  const h1 = (html.match(/<h1[^>]*>(.*?)<\/h1>/s) || [])[1] || '';
  const eyebrow = (html.match(/<div class="eyebrow">(.*?)<\/div>/s) || [])[1] || '';
  pages.push({ path, title, desc, h1, eyebrow });
} });
const unesc = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const SECTION = [['/places/', 'Places'], ['/outdoors/', 'Runs and treks'], ['/history/', 'History'], ['/markets/', 'Markets'], ['/events/', 'Events'], ['/meetups/', 'Meetups'], ['/PuneMetroguide/', 'Metro guide'], ['/stops/', 'Metro stops'], ['/interests/', 'Interests'], ['/powered-by/', 'Powered by'], ['/about/', 'About'], ['/moments/', 'Moments']];
const font = 'file://' + resolve(root, 'public/fonts/fraunces.woff2');
const inter = 'file://' + resolve(root, 'public/fonts/inter.woff2');
const tmp = '/tmp/og-work'; rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
mkdirSync(join(root, 'public/og'), { recursive: true });
for (const pg of pages) {
  if (pg.path === '/') continue; // the home page keeps the original public/og.png
  const slug = ogSlug(pg.path);
  const section = (SECTION.find(([p]) => pg.path.startsWith(p)) || [null, 'Pune'])[1];
  const name = pg.path === '/404.html' ? 'Page not found' : unesc(pg.title.split(' | ')[0]).replace(/^(Places to visit in Pune|Running routes in Pune and treks near Pune)[:,].*/, (m) => m);
  const headline = unesc(pg.h1) && !/^(Closed|Everything)/.test(unesc(pg.h1)) && unesc(pg.h1).length < 70 && pg.path.split('/').filter(Boolean).length > 1 ? unesc(pg.h1) : name;
  const big = headline.length > 52 ? 54 : headline.length > 34 ? 66 : 82;
  const full = unesc(pg.desc); const sub = full.length > 118 ? full.slice(0, 118).replace(/\s+\S*$/, '').replace(/[.,;:]+$/, '') + '…' : full;
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:F;src:url('${font}');font-weight:100 900}@font-face{font-family:I;src:url('${inter}');font-weight:100 900}
*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#F6EFE2;color:#1C1410;font-family:I,sans-serif;position:relative;overflow:hidden}
.bar{position:absolute;left:80px;top:64px;font:800 42px F,Georgia,serif}.bar b{color:#B8381F}
.tag{position:absolute;right:80px;top:62px;background:#E8A317;border:4px solid #1C1410;box-shadow:6px 6px 0 #1C1410;padding:8px 26px;border-radius:999px;font:700 26px I,sans-serif}
h1{position:absolute;left:80px;right:80px;top:188px;margin:0;font:800 ${big}px/1.06 F,Georgia,serif;letter-spacing:-0.02em;max-height:250px;overflow:hidden}
p{position:absolute;left:80px;right:120px;top:468px;margin:0;font:500 28px/1.4 I,sans-serif;color:#50453E}
.line{position:absolute;left:0;right:0;bottom:0;height:22px;background:#B8381F;border-top:4px solid #1C1410}
</style><div class="bar">Peak <b>Pune</b></div><div class="tag">${esc(section)}</div><h1>${esc(headline)}</h1><p>${esc(sub)}</p><div class="line"></div>`;
  writeFileSync(join(tmp, slug + '.html'), html);
  execFileSync('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--force-device-scale-factor=1', '--window-size=1200,630', '--virtual-time-budget=3000', `--screenshot=${join(root, 'public/og', slug + '.png')}`, 'file://' + join(tmp, slug + '.html')], { stdio: 'ignore' });
}
console.log(`Wrote ${pages.length - 1} share images to public/og/`);
