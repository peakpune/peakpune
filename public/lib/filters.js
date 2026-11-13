const day = (s) => new Date(s + 'T00:00:00Z');
const iso = (d) => d.toISOString().slice(0, 10);
export function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    const d = day(value);
    return Number.isFinite(d.getTime()) && iso(d) === value;
}
export function weekendRange(today) {
    if (!isDate(today))
        throw new TypeError('bad date');
    const d = day(today), dow = d.getUTCDay();
    const toFri = dow === 0 ? -2 : dow >= 5 ? -(dow - 5) : 5 - dow;
    const fri = new Date(d.getTime() + toFri * 864e5), sun = new Date(fri.getTime() + 2 * 864e5);
    return { from: iso(fri) < today ? today : iso(fri), to: iso(sun) };
}
export const isWeekend = (e, today) => {
    const r = weekendRange(today);
    return typeof e.date === 'string' && e.date >= r.from && e.date <= r.to;
};
export const istDate = (now = Date.now()) => new Date(now + 330 * 60000).toISOString().slice(0, 10);
