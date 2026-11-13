// Pune "right now" strip: turns the Open-Meteo forecast and air-quality responses into what the page shows.
// Pure functions only (no DOM, no fetch), so every rule here is covered by tests.
import { moonIllumination, moonTimes, phaseName } from './astro.js';
export const PUNE = { lat: 18.5204, lng: 73.8567, timeZone: 'Asia/Kolkata' };
const IST_OFFSET = '+05:30';
export const forecastUrl = () => `https://api.open-meteo.com/v1/forecast?latitude=${PUNE.lat}&longitude=${PUNE.lng}&current=temperature_2m&hourly=temperature_2m,precipitation_probability&daily=sunrise,sunset&timezone=${encodeURIComponent(PUNE.timeZone)}&forecast_days=2`;
export const airUrl = () => `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${PUNE.lat}&longitude=${PUNE.lng}&current=us_aqi,pm2_5&timezone=${encodeURIComponent(PUNE.timeZone)}`;
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const rec = (v) => (typeof v === 'object' && v !== null ? v : {});
const arr = (v) => (Array.isArray(v) ? v : []);
/** Open-Meteo local times look like "2026-11-14T06:32" in the requested zone. */
export const parseLocal = (s) => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s))
        return null;
    const t = new Date(`${s.slice(0, 16)}:00${IST_OFFSET}`);
    return Number.isNaN(t.getTime()) ? null : t;
};
export const istDate = (now) => new Intl.DateTimeFormat('en-CA', { timeZone: PUNE.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const clock = (d) => new Intl.DateTimeFormat('en-IN', { timeZone: PUNE.timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(/\s?([ap])m/i, (_m, c) => ` ${c.toLowerCase()}m`);
export const duration = (ms) => `${Math.floor(ms / 3_600_000)} h ${String(Math.round((ms % 3_600_000) / 60_000)).padStart(2, '0')} m`;
/** US AQI categories (the scale the air-quality service reports). */
export function aqiBand(value) {
    if (value <= 50)
        return { label: 'Good', tone: 'good' };
    if (value <= 100)
        return { label: 'Moderate', tone: 'moderate' };
    if (value <= 150)
        return { label: 'Unhealthy for sensitive groups', tone: 'sensitive' };
    if (value <= 200)
        return { label: 'Unhealthy', tone: 'unhealthy' };
    if (value <= 300)
        return { label: 'Very unhealthy', tone: 'unhealthy' };
    return { label: 'Hazardous', tone: 'unhealthy' };
}
export function buildView(forecast, air, now) {
    const f = rec(forecast);
    const today = istDate(now);
    const cur = rec(f.current);
    const temp = num(cur.temperature_2m);
    // Next hour: the first hourly slot that starts after "now".
    const hourly = rec(f.hourly);
    const times = arr(hourly.time);
    const temps = arr(hourly.temperature_2m);
    const rains = arr(hourly.precipitation_probability);
    let next = null;
    for (let i = 0; i < times.length; i++) {
        const t = parseLocal(times[i]);
        const tt = num(temps[i]);
        if (t && tt !== null && t.getTime() > now.getTime()) {
            next = { at: clock(t), temp: tt, rain: num(rains[i]) };
            break;
        }
    }
    // Sunrise and sunset for today in Pune.
    const daily = rec(f.daily);
    const days = arr(daily.time);
    const idx = days.indexOf(today);
    const rise = idx >= 0 ? parseLocal(arr(daily.sunrise)[idx]) : null;
    const set = idx >= 0 ? parseLocal(arr(daily.sunset)[idx]) : null;
    const sun = rise && set && set > rise ? { rise: clock(rise), set: clock(set), daylight: duration(set.getTime() - rise.getTime()) } : null;
    // Moon: computed on this device for today's IST day.
    const dayStart = new Date(`${today}T00:00:00${IST_OFFSET}`);
    const mt = moonTimes(dayStart, PUNE.lat, PUNE.lng);
    const ill = moonIllumination(now);
    const moon = { rise: mt.rise ? clock(mt.rise) : null, set: mt.set ? clock(mt.set) : null, phase: phaseName(ill.phase), lit: Math.round(ill.fraction * 100) };
    const a = rec(rec(air).current);
    const aqi = num(a.us_aqi);
    const airView = aqi === null ? null : { value: Math.round(aqi), ...aqiBand(aqi), pm25: num(a.pm2_5) };
    return { air: airView, now: temp === null ? null : { temp }, next, sun, moon };
}
