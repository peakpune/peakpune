const day = (s: string): Date => new Date(s + 'T00:00:00Z');
const iso = (d: Date): string => d.toISOString().slice(0, 10);
export function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = day(value);
  return Number.isFinite(d.getTime()) && iso(d) === value;
}
export function weekendRange(today: string): { from: string; to: string } {
  if (!isDate(today)) throw new TypeError('bad date');
  const d = day(today), dow = d.getUTCDay();
  const toFri = dow === 0 ? -2 : dow >= 5 ? -(dow - 5) : 5 - dow;
  const fri = new Date(d.getTime() + toFri * 864e5), sun = new Date(fri.getTime() + 2 * 864e5);
  return { from: iso(fri) < today ? today : iso(fri), to: iso(sun) };
}
export const isWeekend = (e: { date?: string }, today: string): boolean => {
  const r = weekendRange(today);
  return typeof e.date === 'string' && e.date >= r.from && e.date <= r.to;
};
export const istDate = (now: number = Date.now()): string => new Date(now + 330 * 60000).toISOString().slice(0, 10);
