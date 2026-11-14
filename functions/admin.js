// Private approval screen. Cloudflare Access must protect /admin* and /api/admin/*; the API also verifies the Access token itself.
import { isAdmin } from './_lib/api.js';
const PAGE = `<!doctype html><meta charset=utf-8><meta name=robots content="noindex,nofollow"><meta name=viewport content="width=device-width,initial-scale=1"><title>Review plans</title>
<style>body{font:16px system-ui;max-width:42rem;margin:1rem auto;padding:0 1rem}article{border:1px solid #ccc;border-radius:8px;padding:.8rem;margin:.8rem 0}button{margin-right:.5rem;padding:.4rem .8rem}img{max-width:100%}</style>
<h1>Review plans</h1><p id=s>Loading...</p><div id=l></div>
<script>
const e=(t,x)=>{const n=document.createElement(t);if(x)n.textContent=x;return n};
async function load(){const r=await fetch('/api/admin/list');if(!r.ok){s.textContent='Not allowed.';return}const{plans}=await r.json();s.textContent=plans.length?plans.length+' to review':'Nothing to review.';l.replaceChildren(...plans.map(p=>{const a=e('article');if(p.image){const i=document.createElement('img');i.src=p.image;i.alt='';a.append(i)}
a.append(e('h3',p.title),e('p',[p.date,p.time,p.venue,p.area].filter(Boolean).join(' · ')),e('p',p.link),e('p',p.status+(p.reports?' · '+p.reports+' reports':'')));
for(const [k,t] of [['approve','Approve'],['reject','Reject']]){const b=e('button',t);b.onclick=async()=>{b.disabled=true;const r=await fetch('/api/admin/decide',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:p.id,action:k})});if(r.ok)load();else b.disabled=false};a.append(b)}return a}))}
load();
</script>`;
export const onRequestGet = async ({ request, env }) => (await isAdmin(request, env))
  ? new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'" } })
  : new Response('Forbidden', { status: 403 });
