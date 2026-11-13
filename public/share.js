// Share a plan's source link. Adapted from the Afterhours share button.
// Native share sheet first, then copy-link fallback. Never throws; returns what happened.
export async function sharePlan({title,url},nav=globalThis.navigator){
 const data={title:title+' - Peak Pune',text:'Pune plan: '+title,url};
 if(nav&&typeof nav.share==='function'){
  try{await nav.share(data);return 'shared';}
  catch(e){if(e&&e.name==='AbortError')return 'cancelled';/* other failure: try copying */}
 }
 if(nav&&nav.clipboard&&typeof nav.clipboard.writeText==='function'){
  try{await nav.clipboard.writeText(url);return 'copied';}catch{return 'failed';}
 }
 return 'unavailable';
}
