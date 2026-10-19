'use client';
import {useState} from 'react';
import {reviewUserAltText} from '@/lib/ai/localAltTextReview.mjs';
export default function LocalAltTextReviewLab() {
  const [text,setText]=useState('');
  const [result,setResult]=useState(null);
  const [error,setError]=useState('');
  const [edited,setEdited]=useState('');
  function review(e){e.preventDefault();try{const r=reviewUserAltText(text);setResult(r);setEdited(r.revision);setError('');}catch(err){setError(err.message);}}
  return <section className="mt-7 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7" aria-label="Free alt text review">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">Try it now: Accessibility writing review</h2><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">LOCAL TEXT CHECK - NOT VISION AI</span></div>
    <p className="mt-2 text-sm text-slate-600">Look at the image yourself and describe only what you see. This tool edits wording and flags guesses; it does not analyze the photo.</p>
    <form onSubmit={review} className="mt-4 space-y-3">
      <label htmlFor="alt-local-source" className="block text-sm font-semibold">Your own description</label>
      <textarea id="alt-local-source" value={text} onChange={e=>setText(e.target.value)} maxLength={1000} rows={3} placeholder="A photo of a blue mug beside a green plant on a wooden table" className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
      <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Review my alt text locally</button>
    </form>
    {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    {result && <div className="mt-4 rounded-xl bg-slate-50 p-4">
      <label htmlFor="alt-local-edited" className="block text-sm font-semibold">Editable suggested wording</label>
      <textarea id="alt-local-edited" value={edited} rows={3} maxLength={1100} onChange={e=>setEdited(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm" />
      <p className="mt-2 text-xs text-slate-500">{edited.length} characters - Human review required</p>
      {result.issues.length ? <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">{result.issues.map(x=><li key={x}>{x}</li>)}</ul> : <p className="mt-2 text-xs text-emerald-800">No common writing issues detected. Check accuracy against the image yourself.</p>}
      <button type="button" disabled={!edited.trim()} onClick={()=>void navigator.clipboard.writeText(edited).catch(()=>setError('Clipboard unavailable. Select text to copy.'))} className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Copy revised alt text</button>
    </div>}
  </section>;
}
