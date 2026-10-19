'use client';
import {useState} from 'react';
const MIME=['image/png','image/jpeg','image/webp'];
export default function RealBackgroundLab(){
 const [file,setFile]=useState(null),[consent,setConsent]=useState(false),
 [busy,setBusy]=useState(false),[error,setError]=useState(''),
 [download,setDownload]=useState(null),[review,setReview]=useState(false);
 async function submit(e){
  e.preventDefault();
  if(busy || review || !consent || !file)return;
  if(!MIME.includes(file.type)||file.size<64||file.size>2000000){setError('Choose a PNG, JPEG or WebP file under 2 MB.');return;}
  setBusy(true);setError('');setDownload(null);
  const body=new FormData();body.set('image',file);body.set('paidConsent','yes');body.set('requestId',crypto.randomUUID());
  try{
   const response=await fetch('/api/ai/real/background',{method:'POST',body,credentials:'same-origin',cache:'no-store'});
   const result=await response.json();
   if(!response.ok){if(response.status===409)setReview(true);throw Error(result.error||'Background removal unavailable.');}
   if(typeof result.downloadUrl!=='string'||!result.downloadUrl.startsWith('/api/ai/real/background/download?requestId=')){
     setReview(true);throw Error('Unverified result. Contact support before retry.');
   }
   setDownload(result.downloadUrl);
  }catch(e){setReview(true);setError(e instanceof Error?e.message:'Request outcome unknown. Do not retry.');}
  finally{setBusy(false);}
 }
 return <section aria-label="Real background removal controlled beta" className="mt-7 rounded-3xl border border-indigo-200 bg-white p-5 sm:p-7">
  <h2 className="text-lg font-bold text-slate-900">Real AI Background Removal · Controlled beta</h2>
  <p className="mt-2 text-sm text-slate-600">This optional tool uploads your photo to remove.bg and stores a verified private PNG in Backblaze B2 when enabled by the operator. The vendor can charge one credit per request. Beta limit: 2 MB / 4 MP. The free browser editor above is separate.</p>
  <form className="mt-4 space-y-4" onSubmit={submit}>
   <label htmlFor="bg-real-image" className="block text-sm font-semibold text-slate-900">Image to process</label>
   <input id="bg-real-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{setFile(e.target.files?.[0]||null);setError('');setDownload(null);setReview(false);setConsent(false);}} className="block w-full rounded-xl border border-slate-300 p-3 text-sm" />
   <label className="flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} className="mt-1" /><span>I authorize one paid remove.bg credit for this photo, subject to my remaining quotas and operator vendor-credit cap.</span></label>
   <button type="submit" disabled={!file||!consent||busy||review} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?'Removing background…':'Remove background with real AI'}</button>
  </form>
  {error&&<p role="alert" className="mt-3 text-sm text-amber-800">{error}</p>}
  {review&&<p className="mt-2 text-xs text-amber-800">This request needs review. A new attempt may consume another vendor credit; please do not retry automatically.</p>}
  {download&&<a href={download} className="mt-4 inline-block rounded-xl border border-emerald-300 px-5 py-3 text-sm font-bold text-emerald-800">Download private verified PNG</a>}
 </section>;
}
