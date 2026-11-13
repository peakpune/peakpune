import { isDate, istDate } from './filters.js';
const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
export function safeDistrictLink(value) {
    if (!object(value) || typeof value.url !== 'string')
        return false;
    try {
        const u = new URL(value.url);
        return u.protocol === 'https:' && u.hostname === 'www.district.in' && !u.username && !u.password;
    }
    catch {
        return false;
    }
}
export function parseSnapshot(value, now = Date.now()) {
    if (!object(value))
        throw new TypeError('Invalid snapshot');
    const expiresAt = typeof value.expiresAt === 'string' ? Date.parse(value.expiresAt) : NaN;
    const fetchedAt = typeof value.fetchedAt === 'string' ? Date.parse(value.fetchedAt) : NaN;
    if (value.schemaVersion !== 1 || !Number.isFinite(expiresAt) || !Number.isFinite(fetchedAt) || expiresAt <= now || fetchedAt > now + 60000 || expiresAt <= fetchedAt || expiresAt - fetchedAt > 86400000)
        throw new TypeError('Refresh needed');
    const today = istDate(now);
    const events = [];
    for (const e of Array.isArray(value.events) ? value.events : []) {
        if (!object(e) || e.city !== 'Pune' || typeof e.title !== 'string' || !e.title.trim() || !isDate(e.date) || e.date < today || !Array.isArray(e.links))
            continue;
        const links = e.links.filter(safeDistrictLink);
        if (!links.length)
            continue;
        events.push({ title: e.title, date: e.date, city: 'Pune', place: typeof e.place === 'string' ? e.place : '', links });
    }
    const status = (Array.isArray(value.status) ? value.status : []).filter(object).filter(s => typeof s.state === 'string').map(s => ({ state: s.state }));
    return { events, status, fetchedAt, expiresAt };
}
export function nextRefreshAt(snapshot, now = Date.now()) {
    const midnight = Date.parse(istDate(now) + 'T00:00:00+05:30') + 86400000;
    return Math.max(1, Math.min(snapshot.expiresAt, midnight) - now + 10);
}
