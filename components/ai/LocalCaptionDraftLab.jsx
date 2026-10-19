'use client';
import { useState } from 'react';
import { createLocalCaptionDrafts } from '@/lib/ai/localCaptionDraft.mjs';
export default function LocalCaptionDraftLab() {
  const [description,setDescription]=useState('');
  const [tags,setTags]=useState('');
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [edited,setEdited]=useState({});
  function makeDrafts(event) {
    event.preventDefault();
    try { setResult(createLocalCaptionDrafts({description,hashtags:tags})); setEdited({}); setError(''); }
    catch(e) {setError(e.message); setResult(null);}
  }
  return <section className="mt-7 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7" aria-label="Free local caption drafts">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">Try it now: Free caption drafts</h2><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">TEXT TEMPLATE - NOT AI</span></div>
    <p className="mt-2 text-sm text-slate-600">Your words become three editable caption styles in your browser. No login API request, provider call or quota usage for this lab.</p>
    <form onSubmit={makeDrafts} className="mt-4 grid gap-3">
      <label htmlFor="local-caption-source" className="text-sm font-semibold text-slate-800">What is your post about?</label>
      <textarea id="local-caption-source" required minLength={3} maxLength={600} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Our team finished the new website today" rows={3} className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900" />
      <label htmlFor="local-caption-tags" className="text-sm font-semibold text-slate-800">Hashtags (optional, up to three)</label>
      <input id="local-caption-tags" maxLength={150} value={tags} onChange={e=>setTags(e.target.value)} placeholder="webdev nepal team" className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
      <button type="submit" className="w-fit rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Create three drafts locally</button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {result && <div className="mt-5 grid gap-3 lg:grid-cols-3">{result.drafts.map(item=><div key={item.style} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <label htmlFor={`local-caption-${item.style}`} className="text-xs font-bold uppercase text-slate-600">{item.style}</label>
      <textarea id={`local-caption-${item.style}`} rows={5} maxLength={1100} value={edited[item.style] ?? item.text} onChange={e=>setEdited(prev=>({...prev,[item.style]:e.target.value}))} className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm" />
      <button type="button" onClick={()=>void navigator.clipboard.writeText(edited[item.style] ?? item.text).catch(()=>setError('Clipboard unavailable. Please select the text to copy.'))} className="mt-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold">Copy</button>
    </div>)}</div>}
  </section>;
}
