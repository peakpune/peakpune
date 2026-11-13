const status=document.querySelector('#plans-status');const health=document.querySelector('#plans-health');const grid=document.querySelector('#plans');
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
const safeLink=l=>{try{const u=new URL(l.url);return u.protocol==='https:'&&u.hostname==='www.district.in'&&!u.username&&!u.password;}catch{return false;}};
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
let timer;
async function load(){clearTimeout(timer);grid.replaceChildren();try{
 const r=await fetch('data/plans.json',{cache:'no-cache'});if(!r.ok)throw Error('Unavailable');const d=await r.json();const expiry=Date.parse(d.expiresAt),checked=Date.parse(d.fetchedAt);
 if(d.schemaVersion!==1||!Number.isFinite(expiry)||!Number.isFinite(checked)||expiry<=Date.now()||checked>Date.now()+60000||expiry-checked>24*3600000)throw Error('Refresh needed');
 const today=new Date(Date.now()+330*60000).toISOString().slice(0,10);
 const rows=(Array.isArray(d.events)?d.events:[]).filter(e=>e.city==='Pune'&&typeof e.title==='string'&&dateOK(e.date)&&e.date>=today&&Array.isArray(e.links)&&e.links.some(safeLink));
 status.textContent=`${rows.length} source-listed Pune plans. Checked ${new Date(checked).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})} IST. Manual snapshot; expires ${new Date(expiry).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})} IST. Past dates hidden daily. No automatic source refresh.`;
 const sources=Array.isArray(d.status)?d.status:[];health.textContent=`District: ${sources.filter(s=>s.state==='ok').length}/${sources.length} category pages available at check. Meetup and Reddit feeds are not connected.`;
 if(!rows.length){status.textContent='No upcoming source-listed plans in the current snapshot.';return;}
 timer=setTimeout(load,Math.max(1,Math.min(expiry-Date.now(),new Date(today+'T00:00:00+05:30').getTime()+86400000-Date.now())+10));
 rows.forEach(e=>{const card=text('article','','card plan-card'),inner=text('div','','inner');inner.append(text('span',e.date,'eyebrow'),text('h3',e.title),text('p',e.place||'Venue: check source'));const a=text('a','View current details','chip');a.href=e.links.find(safeLink).url;a.target='_blank';a.rel='noopener noreferrer';inner.append(a,text('p','District-listed · Not organiser-confirmed','note'));card.append(inner);grid.append(card);});
 }catch{grid.replaceChildren();status.textContent='Plans need a fresh source check. Nothing outdated is shown.';health.textContent='The snapshot is unavailable or older than 24 hours. No live availability is promised.';}}
load();
