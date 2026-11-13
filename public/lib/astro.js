// Moon position, phase and rise/set times, computed on the device (no network).
// Low-precision formulas (Meeus-style, as in the public-domain SunCalc): good to a few minutes,
// which is why the page labels moon times "approx.". Sunrise and sunset come from the weather service instead.
const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const J1970 = 2_440_588;
const J2000 = 2_451_545;
const OBLIQUITY = RAD * 23.4397;
const toDays = (date) => date.valueOf() / DAY_MS - 0.5 + J1970 - J2000;
const rightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBLIQUITY) - Math.tan(b) * Math.sin(OBLIQUITY), Math.cos(l));
const declination = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBLIQUITY) + Math.cos(b) * Math.sin(OBLIQUITY) * Math.sin(l));
const siderealTime = (d, lw) => RAD * (280.16 + 360.9856235 * d) - lw;
const refraction = (h) => { const alt = h < 0 ? 0 : h; return 0.0002967 / Math.tan(alt + 0.00312536 / (alt + 0.08901179)); };
function moonCoords(d) {
    const L = RAD * (218.316 + 13.176396 * d);
    const M = RAD * (134.963 + 13.064993 * d);
    const F = RAD * (93.272 + 13.22935 * d);
    const l = L + RAD * 6.289 * Math.sin(M);
    const b = RAD * 5.128 * Math.sin(F);
    return { ra: rightAscension(l, b), dec: declination(l, b), dist: 385_001 - 20_905 * Math.cos(M) };
}
function sunCoords(d) {
    const M = RAD * (357.5291 + 0.98560028 * d);
    const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + RAD * 102.9372 + Math.PI;
    return { ra: rightAscension(L, 0), dec: declination(L, 0) };
}
/** Moon altitude above the horizon in radians, refraction included. */
export function moonAltitude(date, lat, lng) {
    const d = toDays(date);
    const c = moonCoords(d);
    const H = siderealTime(d, RAD * -lng) - c.ra;
    const phi = RAD * lat;
    const h = Math.asin(Math.sin(phi) * Math.sin(c.dec) + Math.cos(phi) * Math.cos(c.dec) * Math.cos(H));
    return h + refraction(h);
}
/** `fraction` is the lit share of the disc (0 to 1); `phase` runs 0 (new) to 1, with 0.5 full. */
export function moonIllumination(date) {
    const d = toDays(date);
    const s = sunCoords(d);
    const m = moonCoords(d);
    const sunDist = 149_598_000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sunDist * Math.sin(phi), m.dist - sunDist * Math.cos(phi));
    const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra), Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    return { fraction: (1 + Math.cos(inc)) / 2, phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / Math.PI };
}
export function phaseName(phase) {
    const names = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
    return names[Math.round(phase * 8) % 8] ?? 'New moon';
}
/** Moonrise and moonset within the 24 hours after `dayStart`. Either can be null (the moon may not rise or set that day). */
export function moonTimes(dayStart, lat, lng) {
    const hc = 0.133 * RAD;
    const at = (hours) => moonAltitude(new Date(dayStart.valueOf() + (hours * DAY_MS) / 24), lat, lng) - hc;
    let rise = null;
    let set = null;
    let h0 = at(0);
    for (let i = 1; i <= 24; i += 2) {
        const h1 = at(i);
        const h2 = at(i + 1);
        const a = (h0 + h2) / 2 - h1;
        const b = (h2 - h0) / 2;
        const xe = -b / (2 * a);
        const ye = (a * xe + b) * xe + h1;
        const disc = b * b - 4 * a * h1;
        let roots = 0;
        let x1 = 0;
        let x2 = 0;
        if (disc >= 0) {
            const dx = Math.sqrt(disc) / (Math.abs(a) * 2);
            x1 = xe - dx;
            x2 = xe + dx;
            if (Math.abs(x1) <= 1)
                roots++;
            if (Math.abs(x2) <= 1)
                roots++;
            if (x1 < -1)
                x1 = x2;
        }
        if (roots === 1) {
            if (h0 < 0)
                rise = i + x1;
            else
                set = i + x1;
        }
        else if (roots === 2) {
            rise = i + (ye < 0 ? x2 : x1);
            set = i + (ye < 0 ? x1 : x2);
        }
        if (rise !== null && set !== null)
            break;
        h0 = h2;
    }
    const toDate = (h) => (h === null ? null : new Date(dayStart.valueOf() + (h * DAY_MS) / 24));
    return { rise: toDate(rise), set: toDate(set) };
}
