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
const addDays = (s, n) => iso(new Date(day(s).getTime() + n * 864e5));
// Rolling windows, always worked out from today's IST date: never typed in.
export function nextWeekendRange(today) {
    return weekendRange(addDays(weekendRange(today).to, 1));
}
export function nextMonthRange(today) {
    if (!isDate(today))
        throw new TypeError('bad date');
    const d = day(today), y = d.getUTCFullYear(), m = d.getUTCMonth();
    return { from: iso(new Date(Date.UTC(y, m + 1, 1))), to: iso(new Date(Date.UTC(y, m + 2, 0))) };
}
export function nextQuarterRange(today) {
    if (!isDate(today))
        throw new TypeError('bad date');
    const d = day(today), y = d.getUTCFullYear(), q = Math.floor(d.getUTCMonth() / 3);
    return { from: iso(new Date(Date.UTC(y, (q + 1) * 3, 1))), to: iso(new Date(Date.UTC(y, (q + 2) * 3, 0))) };
}
export const RANGES = [
    { key: 'wknd', label: 'This weekend' }, { key: 'nextwknd', label: 'Next weekend' },
    { key: 'nextmonth', label: 'Next month' }, { key: 'nextquarter', label: 'Next quarter' },
];
export function rangeOf(key, today) {
    return { wknd: weekendRange, nextwknd: nextWeekendRange, nextmonth: nextMonthRange, nextquarter: nextQuarterRange }[key](today);
}
export const inRange = (e, key, today) => {
    const r = rangeOf(key, today);
    return typeof e.date === 'string' && e.date >= r.from && e.date <= r.to;
};
