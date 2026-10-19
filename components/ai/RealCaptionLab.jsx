"use client";
import {useState} from "react";
export default function RealCaptionLab(){
  const [description,setDescription]=useState("");const [result,setResult]=useState("");
  const [error,setError]=useState("");const [busy,setBusy]=useState(false);
  const [requiresReview,setRequiresReview]=useState(false);
  async function generate(event){event.preventDefault();if(busy)return;
    const text=description.trim();if(requiresReview||text.length<3||text.length>1200)return;
    const requestId=crypto.randomUUID();setBusy(true);setError("");setResult("");
    try{const body=JSON.stringify({description:text,requestId});
      const response=await fetch("/api/ai/real/caption",{method:"POST",headers:{"Content-Type":"application/json"},body});
      const payload=await response.json();
      if(!response.ok){if(response.status===409)setRequiresReview(true);throw new Error(payload.error||"Real AI unavailable");}
      setResult(payload.text);
    }catch(err){setError(err instanceof Error?err.message:"Request failed; do not auto-retry.");}
    finally{setBusy(false);}}
  return <section aria-label="Real AI Caption beta" className="mt-6 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-900">Real AI Caption · controlled beta</h2><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Requires operator approval</span></div>
    <p className="mt-2 text-sm text-slate-600">This feature may use billable AI when enabled. Daily quota and a server-side budget apply. Unknown outcomes are not retried.</p>
    <form onSubmit={generate} className="mt-4 space-y-3"><label className="block text-sm font-semibold" htmlFor="real-caption-prompt">Describe your post</label>
      <textarea id="real-caption-prompt" value={description} onChange={e=>{setDescription(e.target.value);setRequiresReview(false);}} maxLength={1200} rows={4} className="w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="A new product launch announcement..."/>
      <button disabled={busy||requiresReview||description.trim().length<3} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" type="submit">{busy?"Generating...":"Generate with AI"}</button></form>
    {error&&<p role="alert" className="mt-3 text-sm text-amber-800">{error}</p>}
    {result&&<div className="mt-4 space-y-2"><label className="text-sm font-semibold" htmlFor="real-caption-result">Editable caption</label>
      <textarea id="real-caption-result" rows={4} value={result} onChange={e=>setResult(e.target.value)} className="w-full rounded-xl border border-slate-300 p-3 text-sm"/>
      <button className="rounded-lg border px-4 py-2 text-sm" type="button" onClick={()=>navigator.clipboard.writeText(result)}>Copy caption</button></div>}
  </section>;
}
