#!/usr/bin/env node
// Manual, credential-free Pune feed export. No timers or background jobs.
import { writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUNE_SOURCES, parseDistrictPune } from '../src/discovery.js';
import { istDate, normalizePuneEvents } from '../src/events.js';
export const SOURCES = Object.freeze(PUNE_SOURCES.filter(s=>s.id.startsWith('District Pune')));
const restricted = e=>/(students|members|alumni|employees)\s+only|invite[-\s]only|closed event|private event/i.test(e.title);
export async function fetchText(url) {
  if(!SOURCES.some(s=>s.url===url)) throw new Error('Source not in fixed public Pune allowlist');
  const r=await fetch(url,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{'User-Agent':'PeakPune/0.1 (public event discovery; source links retained)'}});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  if(!/text\/html/i.test(r.headers.get('content-type')||'')) throw new Error('Unexpected source content type');
  const reader=r.body.getReader();let bytes=0;const parts=[];
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>3_000_000){await reader.cancel();throw new Error('Source response too large');}parts.push(value);}
  return Buffer.concat(parts).toString('utf8');
}
export async function collectPlans({transport=fetchText,now=new Date()}={}) {
  const status=[],all=[];const checkedAt=now.toISOString();
  // Five public pages, once each, sequentially. No detail-page fan-out or retries.
  for(const source of SOURCES){
    try{const parsed=parseDistrictPune(await transport(source.url));const rows=normalizePuneEvents(parsed.filter(e=>!restricted(e)),{today:istDate(now)}).filter(e=>e.links.every(l=>new URL(l.url).hostname==='www.district.in'));
      all.push(...rows);status.push({source:source.id,url:source.url,state:'ok',count:rows.length,checkedAt});
    }catch{status.push({source:source.id,url:source.url,state:'unavailable',count:0,checkedAt});}
  }
  const events=normalizePuneEvents(all,{today:istDate(now)}).map(e=>({...e,checkedAt,verification:'platform-listed; organiser details not independently confirmed'}));
  return {schemaVersion:1,fetchedAt:checkedAt,expiresAt:new Date(+now+24*3600000).toISOString(),timezone:'Asia/Kolkata',events,status,partial:status.some(s=>s.state!=='ok'),disabledSources:[{source:'Meetup',reason:'Current discovery-query robots restrictions; parser retained offline only'},{source:'Reddit',reason:'Current robots restrictions; parser retained offline only'}]};
}
export async function savePlans(path,payload){
  if(!payload.events.length)throw new Error('No upcoming plans: refusing to replace an existing export');
  if(!payload.status.some(s=>s.state==='ok'))throw new Error('No healthy source');
  await mkdir(dirname(path),{recursive:true});const temp=path+'.tmp';
  try{await writeFile(temp,JSON.stringify(payload,null,2)+'\n',{mode:0o644});await rename(temp,path);}catch(e){await unlink(temp).catch(()=>{});throw e;}
}
async function main(){
  const args=process.argv.slice(2);if(args.length && !(args.length===2&&args[0]==='--write'))throw new Error('Usage: node scripts/update-plans.mjs [--write output.json]');
  const payload=await collectPlans();
  if(args[0]==='--write'){const path=resolve(args[1]);await savePlans(path,payload);console.log(`Exported ${payload.events.length} source-linked Pune plans to ${path}`);}
  else console.log(JSON.stringify({fetchedAt:payload.fetchedAt,count:payload.events.length,status:payload.status,partial:payload.partial,sample:payload.events.slice(0,3)},null,2));
  if(!payload.events.length)process.exitCode=1;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
