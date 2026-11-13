// Filters ported in spirit from Afterhours, limited to what the data supports.
// Records have one date and a price string; no end dates, no category field.
const day=s=>new Date(s+'T00:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
export function weekendRange(today){
 const d=day(today);if(Number.isNaN(d.getTime())||iso(d)!==today)throw new TypeError('bad date');
 const dow=d.getUTCDay();// 0 Sun..6 Sat
 const toFri=dow===0?-2:dow>=5?-(dow-5):5-dow;
 const fri=new Date(d.getTime()+toFri*864e5),sun=new Date(fri.getTime()+2*864e5);
 return {from:iso(fri)<today?today:iso(fri),to:iso(sun)};
}
export const isWeekend=(e,today)=>{const r=weekendRange(today);return typeof e.date==='string'&&e.date>=r.from&&e.date<=r.to;};
// Free only when the listing price says so exactly. Missing or unclear price is not free.
export const isFree=e=>typeof e.price==='string'&&/^(INR|Rs\.?|₹)?\s*(free|0)$/i.test(e.price.trim());
