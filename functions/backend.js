// Private approval screen. The page holds no data; every /api/admin/* call checks the owner's signed session cookie.
const PAGE = `<!doctype html><meta charset=utf-8><meta name=robots content="noindex,nofollow"><meta name=viewport content="width=device-width,initial-scale=1"><title>Review plans</title>
<style>body{font:16px system-ui;max-width:42rem;margin:1rem auto;padding:0 1rem}article{border:1px solid #ccc;border-radius:8px;padding:.8rem;margin:.8rem 0}button{margin-right:.5rem;padding:.4rem .8rem}img{max-width:100%}</style>
<h1>Review plans</h1><form id=f hidden><label>Passphrase <input id=k type=password autocomplete=current-password></label> <button>Sign in</button></form><p id=s>Loading...</p><div id=l></div>
<script>
const e=(t,x)=>{const n=document.createElement(t);if(x)n.textContent=x;return n};
async function load(){const r=await fetch('/api/admin/list');if(!r.ok){s.textContent='Sign in to review plans.';f.hidden=false;return}f.hidden=true;const{plans}=await r.json();s.textContent=plans.length?plans.length+' to review':'Nothing to review.';l.replaceChildren(...plans.map(p=>{const a=e('article');if(p.image){const i=document.createElement('img');i.src=p.image;i.alt='';a.append(i)}
a.append(e('h3',p.title),e('p',[p.date,p.time,p.venue,p.area].filter(Boolean).join(' · ')),e('p',p.link),e('p',p.status+(p.reports?' · '+p.reports+' reports':'')));
for(const [k,t] of [['approve','Approve'],['reject','Reject']]){const b=e('button',t);b.onclick=async()=>{b.disabled=true;const r=await fetch('/api/admin/decide',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:p.id,action:k})});if(r.ok)load();else b.disabled=false};a.append(b)}return a}))}
f.onsubmit=async(ev)=>{ev.preventDefault();const r=await fetch('/api/admin/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({passphrase:k.value})});k.value='';if(r.ok)load();else s.textContent=r.status===429?'Too many tries. Wait an hour.':'Wrong passphrase.'};
load();
</script>`;
export const onRequestGet = () => new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'content-security-policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'" } });
