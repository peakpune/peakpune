import { writeFileSync } from 'node:fs';
import QRCode from 'qrcode';

// This matches the exact, verified Pay Rs 150 UPI link on the page.
const payload = 'upi://pay?pa=aakash.kamdi%40superyes&pn=Aakash%20Kamdi&am=150&cu=INR';
const qr = QRCode.create(payload, { errorCorrectionLevel: 'H' });
const size = qr.modules.size;
const quiet = 4;
const total = size + quiet * 2;
const dark = '#B8381F'; // PeakPune brick, high contrast on the paper-colored card.
const light = '#F6EFE2';
const ink = '#1C1410';
const haldi = '#E8A317';
const cells = qr.modules.data;
// H-level correction gives room for the small centered brand badge.
const badge = 5;
const start = Math.floor((size - badge) / 2);
const end = start + badge;
const finders = [[0, 0], [size - 7, 0], [0, size - 7]];
const inFinder = (x, y) => finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="UPI payment QR for Rs 150 to Aakash Kamdi" shape-rendering="geometricPrecision">`,
  `<rect width="${total}" height="${total}" rx="2.2" fill="${light}"/>`,
];

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    if (!cells[y * size + x] || inFinder(x, y) || (x >= start && x < end && y >= start && y < end)) continue;
    const xx = x + quiet, yy = y + quiet;
    // Small, separated rounded dots keep the matrix legible when rendered compactly.
    parts.push(`<rect x="${xx + 0.08}" y="${yy + 0.08}" width="0.84" height="0.84" rx="0.32" fill="${dark}"/>`);
  }
}

// Rounded but still unmistakable finder targets. Their 7/5/3 nested geometry
// remains large and distinct enough for common camera QR detectors.
for (const [fx, fy] of finders) {
  const x = fx + quiet, y = fy + quiet;
  parts.push(`<rect x="${x}" y="${y}" width="7" height="7" rx="1.15" fill="${dark}"/>`);
  parts.push(`<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="0.85" fill="${light}"/>`);
  parts.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.55" fill="${dark}"/>`);
}

// Compact PeakPune mark, enclosed by a cream knockout and mustard badge.
const bx = start + quiet, by = start + quiet;
parts.push(`<rect x="${bx - 0.35}" y="${by - 0.35}" width="${badge + 0.7}" height="${badge + 0.7}" rx="1.35" fill="${light}" stroke="${ink}" stroke-width="0.35"/>`);
parts.push(`<rect x="${bx + 0.05}" y="${by + 0.05}" width="${badge - 0.1}" height="${badge - 0.1}" rx="1.05" fill="${haldi}" stroke="${ink}" stroke-width="0.2"/>`);
parts.push(`<text x="${bx + badge / 2}" y="${by + badge / 2 + 0.68}" text-anchor="middle" font-family="Arial,sans-serif" font-size="2.15" font-weight="900" fill="${ink}">PP</text></svg>`);
writeFileSync('public/meet-payment.svg', parts.join(''));
console.log(`Generated ${size}x${size} H-correction brick-red QR SVG from the Rs 150 UPI payload.`);
