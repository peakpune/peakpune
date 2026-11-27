import { writeFileSync } from 'node:fs';
import QRCode from 'qrcode';

// This matches the exact, verified Pay Rs 150 UPI link on the page.
const payload = 'upi://pay?pa=aakash.kamdi%40superyes&pn=Aakash%20Kamdi&am=150&cu=INR';
const qr = QRCode.create(payload, { errorCorrectionLevel: 'H' });
const size = qr.modules.size;
const quiet = 4;
const total = size + quiet * 2;
const dark = '#1c1410';
const light = '#fffdf8';
const cells = qr.modules.data;
// A small center badge is masked into a 5-module patch. H-level correction
// provides room for this, and a separate decoder check guards every generation.
const badge = 5;
const start = Math.floor((size - badge) / 2);
const end = start + badge;
const parts = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="UPI payment QR for Rs 150 to Aakash Kamdi" shape-rendering="crispEdges">`,
  `<rect width="${total}" height="${total}" rx="2" fill="${light}"/>`];
const insideFinder = (x, y) => [[0, 0], [size - 7, 0], [0, size - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    if (!cells[y * size + x] || insideFinder(x, y) || (x >= start && x < end && y >= start && y < end)) continue;
    const xx = x + quiet, yy = y + quiet;
    // Standard square finder/separator patterns remain intact for reliable detection.
    if (x < 8 && y < 8 || x >= size - 8 && y < 8 || x < 8 && y >= size - 8) {
      parts.push(`<rect x="${xx}" y="${yy}" width="1" height="1" fill="${dark}"/>`);
    } else {
      parts.push(`<rect x="${xx + 0.06}" y="${yy + 0.06}" width="0.88" height="0.88" rx="0.26" fill="${dark}"/>`);
    }
  }
}
// Restore the three finder patterns as exact, conventional square targets.
for (const [fx, fy] of [[0,0], [size-7,0], [0,size-7]]) {
  const x = fx + quiet, y = fy + quiet;
  parts.push(`<rect x="${x}" y="${y}" width="7" height="7" fill="${dark}"/>`);
  parts.push(`<rect x="${x+1}" y="${y+1}" width="5" height="5" fill="${light}"/>`);
  parts.push(`<rect x="${x+2}" y="${y+2}" width="3" height="3" fill="${dark}"/>`);
}
const bx = start + quiet, by = start + quiet;
parts.push(`<rect x="${bx-0.25}" y="${by-0.25}" width="${badge+0.5}" height="${badge+0.5}" rx="1.1" fill="${light}" stroke="${dark}" stroke-width="0.35"/>`);
parts.push(`<rect x="${bx+0.25}" y="${by+0.25}" width="${badge-0.5}" height="${badge-0.5}" rx="0.8" fill="#e8a317"/>`);
parts.push(`<text x="${bx+badge/2}" y="${by+badge/2+0.65}" text-anchor="middle" font-family="Arial,sans-serif" font-size="2.2" font-weight="900" fill="${dark}">PP</text></svg>`);
writeFileSync('public/meet-payment.svg', parts.join(''));
console.log(`Generated ${size}x${size} H-correction QR SVG from the Rs 150 UPI payload.`);
