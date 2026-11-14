// Provisional, dormant. Allowlist metadata stripper for uploaded images. Pure byte parsing: no decode,
// no WASM, no Node APIs, so it uses almost no CPU and runs in any Workers runtime.
// Keeps only the chunks needed to display the image; rejects anything it can't fully parse.
// It removes metadata containers (EXIF, XMP, ICC, comments, text chunks, trailing data).
// It does NOT check image content, so a person still approves each image.
export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_PIXELS = 16_000_000;
const fail = (reason) => ({ ok: false, reason });
const ascii = (b, o, n) => String.fromCharCode(...b.subarray(o, o + n));
const u32be = (b, o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u32le = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const concat = (parts) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };

export function sanitizeImage(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (b.length < 16 || b.length > MAX_BYTES) return fail('size');
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return jpeg(b);
  if (u32be(b, 0) === 0x89504e47 && u32be(b, 4) === 0x0d0a1a0a) return png(b);
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return webp(b);
  return fail('type');
}

function jpeg(b) {
  const keep = new Set([0xdb, 0xc4, 0xc0, 0xc1, 0xc2, 0xdd]); // DQT DHT SOF0-2 DRI
  const parts = [b.subarray(0, 2)]; let o = 2, sawSOF = false;
  while (o < b.length) {
    if (b[o] !== 0xff) return fail('jpeg structure');
    while (b[o] === 0xff) o++;
    const m = b[o++];
    if (m === 0xd9) { if (!sawSOF) return fail('jpeg no frame'); parts.push(Uint8Array.of(0xff, 0xd9)); return done('jpeg', concat(parts)); } // EOI: drop anything after it
    if (m >= 0xd0 && m <= 0xd7 || m === 0x01) continue;
    if (o + 2 > b.length) return fail('jpeg truncated');
    const len = (b[o] << 8) | b[o + 1];
    if (len < 2 || o + len > b.length) return fail('jpeg truncated');
    const seg = b.subarray(o - 2, o + len);
    if (m === 0xc3 || (m >= 0xc5 && m <= 0xcf && m !== 0xc8 && m !== 0xcc) || m === 0xc8) return fail('jpeg unsupported');
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      const h = (b[o + 3] << 8) | b[o + 4], w = (b[o + 5] << 8) | b[o + 6];
      if (!w || !h || w * h > MAX_PIXELS) return fail('dimensions');
      sawSOF = true;
    }
    if (m === 0xda) { // SOS: copy header then entropy-coded data until the next real marker
      if (!sawSOF) return fail('jpeg no frame');
      parts.push(seg); o += len; const s = o;
      while (o + 1 < b.length && !(b[o] === 0xff && b[o + 1] !== 0x00 && !(b[o + 1] >= 0xd0 && b[o + 1] <= 0xd7))) o++;
      if (o + 1 >= b.length) return fail('jpeg truncated');
      parts.push(b.subarray(s, o)); continue;
    }
    if (keep.has(m)) parts.push(seg);
    else if (m === 0xee && len >= 14 && ascii(b, o + 2, 5) === 'Adobe') parts.push(seg); // colour transform flag only
    // every other segment (APPn incl. EXIF/XMP/ICC/JFIF thumbnails, COM) is dropped
    o += len;
  }
  return fail('jpeg truncated');
}

function png(b) {
  const keep = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);
  const parts = [b.subarray(0, 8)]; let o = 8, first = true, idat = false;
  while (o + 12 <= b.length) {
    const len = u32be(b, o), type = ascii(b, o + 4, 4), end = o + 12 + len;
    if (end > b.length) return fail('png truncated');
    if (first) { if (type !== 'IHDR' || len !== 13) return fail('png structure'); const w = u32be(b, o + 8), h = u32be(b, o + 12); if (!w || !h || w * h > MAX_PIXELS) return fail('dimensions'); first = false; }
    if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') return fail('animated');
    if (type === 'IDAT') idat = true;
    if (keep.has(type)) parts.push(b.subarray(o, end));
    o = end;
    if (type === 'IEND') return idat ? done('png', concat(parts)) : fail('png no data');
  }
  return fail('png truncated');
}

function webp(b) {
  if (u32le(b, 4) + 8 > b.length) return fail('webp truncated');
  const total = u32le(b, 4) + 8; let o = 12, image = false; const parts = [];
  while (o + 8 <= total) {
    const type = ascii(b, o, 4), len = u32le(b, o + 4), end = o + 8 + len + (len & 1);
    if (end > total) return fail('webp truncated');
    if (type === 'ANIM' || type === 'ANMF') return fail('animated');
    if (type === 'VP8X') { const c = b.slice(o, o + 8 + len); c[8] &= 0x10; parts.push(c); }
    else if (type === 'VP8 ' || type === 'VP8L' || type === 'ALPH') { parts.push(b.subarray(o, end)); if (type !== 'ALPH') image = true; }
    o = end;
  }
  if (!image) return fail('webp no image');
  const body = concat(parts), out = new Uint8Array(12 + body.length);
  out.set(b.subarray(0, 12)); out.set(body, 12);
  out[4] = (out.length - 8) & 255; out[5] = ((out.length - 8) >> 8) & 255; out[6] = ((out.length - 8) >> 16) & 255; out[7] = ((out.length - 8) >>> 24) & 255;
  return done('webp', out);
}
const done = (type, bytes) => ({ ok: true, type, bytes });
