import {isWeekend} from './filters.js';
import {sharePlan} from './share.js';
const status=document.querySelector('#plans-status');const health=document.querySelector('#plans-health');const grid=document.querySelector('#plans');const wk=document.querySelector('#weekend-plans');const bar=document.querySelector('#plan-filters');const fstatus=document.querySelector('#filter-status');const active=new Set();let allRows=[],todayIso='';
const text=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;};
const safeLink=l=>{try{const u=new URL(l.url);return u.protocol==='https:'&&u.hostname==='www.district.in'&&!u.username&&!u.password;}catch{return false;}};
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
let timer;
const share=async(btn,e)=>{const r=await sharePlan({title:e.title,url:e.links.find(safeLink).url});const msg={copied:'Link copied',failed:'Could not copy',unavailable:'Sharing not available'}[r];if(msg){btn.textContent=msg;setTimeout(()=>{btn.textContent='Share';},1800);}};
const card=(e,pricey)=>{const c=text('article','','card plan-card'),inner=text('div','','inner');inner.append(text('span',e.date,'eyebrow'),text('h3',e.title),text('p',e.place||'Venue: check source'));const a=text('a','View current details','chip');a.href=e.links.find(safeLink).url;a.target='_blank';a.rel='noopener noreferrer';const sh=text('button','Share','chip');sh.type='button';sh.setAttribute('aria-label','Share '+e.title);sh.addEventListener('click',()=>share(sh,e));const act=text('div','','plan-actions');act.append(a,sh);inner.append(act,text('p','District-listed · Not organiser-confirmed','note'));c.append(inner);return c;};
function render(){
 const tests={wknd:e=>isWeekend(e,todayIso)};
 const shown=allRows.filter(e=>[...active].every(k=>tests[k](e)));
 grid.replaceChildren(...shown.map(e=>card(e)));
 if(fstatus)fstatus.textContent=active.size?`${shown.length} of ${allRows.length} plans match. Filter uses only the listed date.`:'';
 if(wk){const w=allRows.filter(e=>isWeekend(e,todayIso));wk.replaceChildren(...(w.length?[...w.slice(0,6).map(e=>card(e)),...(w.length>6?[text('p',`Showing 6 of ${w.length} weekend plans. Open Events and tap This weekend for all.`,'note')]:[])]:[text('p','No source-listed plans for this weekend in the current snapshot.','note')]));}
}
bar?.addEventListener('click',ev=>{const b=ev.target.closest('button[data-filter]');if(!b)return;const k=b.dataset.filter;active.has(k)?active.delete(k):active.add(k);b.setAttribute('aria-pressed',active.has(k));render();});
async function load(){clearTimeout(timer);grid.replaceChildren();try{
 const r=await fetch('data/plans.json',{cache:'no-cache'});if(!r.ok)throw Error('Unavailable');const d=await r.json();const expiry=Date.parse(d.expiresAt),checked=Date.parse(d.fetchedAt);
 if(d.schemaVersion!==1||!Number.isFinite(expiry)||!Number.isFinite(checked)||expiry<=Date.now()||checked>Date.now()+60000||expiry-checked>24*3600000)throw Error('Refresh needed');
 const today=new Date(Date.now()+330*60000).toISOString().slice(0,10);
 const rows=(Array.isArray(d.events)?d.events:[]).filter(e=>e.city==='Pune'&&typeof e.title==='string'&&dateOK(e.date)&&e.date>=today&&Array.isArray(e.links)&&e.links.some(safeLink));
 status.textContent=`${rows.length} source-listed Pune plans. Checked ${new Date(checked).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})} IST. Manual snapshot; expires ${new Date(expiry).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})} IST. Past dates hidden daily. No automatic source refresh.`;
 const sources=Array.isArray(d.status)?d.status:[];health.textContent=`District: ${sources.filter(s=>s.state==='ok').length}/${sources.length} category pages available at check. Meetup and Reddit feeds are not connected.`;
 if(!rows.length){status.textContent='No upcoming source-listed plans in the current snapshot.';return;}
 timer=setTimeout(load,Math.max(1,Math.min(expiry-Date.now(),new Date(today+'T00:00:00+05:30').getTime()+86400000-Date.now())+10));
 allRows=rows;todayIso=today;render();
 }catch{grid.replaceChildren();if(wk)wk.replaceChildren(text('p','Plans need a fresh source check. Nothing outdated is shown.','note'));status.textContent='Plans need a fresh source check. Nothing outdated is shown.';health.textContent='The snapshot is unavailable or older than 24 hours. No live availability is promised.';}}
load();
