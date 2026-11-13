// Original, dependency-free validation boundary for a future discovery adapter.
// Never interpret upstream fields as HTML or executable instructions.
export function safeSourceUrl(value) {
  try {const u = new URL(value);return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;} catch {return null;}
}
export function isDate(value) {
  if(typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T00:00:00Z');return !Number.isNaN(+d) && d.toISOString().slice(0,10) === value;
}
export function istDate(now = new Date()) {
  return new Date(+now + 330*60*1000).toISOString().slice(0,10);
}
export function normalizePuneEvents(records,{today=istDate()}={}) {
  if(!isDate(today)) throw new TypeError('Invalid reference date');
  const seen = new Set();const out=[];
  for(const r of records) {
    if(!r || typeof r.title !== 'string' || !r.title.trim() || !isDate(r.date) || r.date < today || String(r.city).trim().toLowerCase() !== 'pune') continue;
    const links=(Array.isArray(r.links)?r.links:[]).map(x=>({url:safeSourceUrl(x?.url),label:String(x?.label||r.source||'Source').slice(0,60)})).filter(x=>x.url);
    if(!links.length) continue;
    const key=r.title.trim().toLocaleLowerCase().replace(/\s+/g,' ')+'|'+r.date;
    if(seen.has(key)) continue;seen.add(key);
    out.push({title:r.title.trim().slice(0,120),date:r.date,city:'Pune',place:String(r.place||'').slice(0,120),price:String(r.price||'').slice(0,80),source:String(r.source||'').slice(0,60),links});
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
}
