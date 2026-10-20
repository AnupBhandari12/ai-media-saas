"use client";

import Image from "next/image";
import {useEffect,useRef,useState} from "react";
import {Download,Upload,ShieldCheck} from "lucide-react";
import {runEcommerceProductPack} from "@/lib/workflows/runEcommerceProductPack";
import {ECOMMERCE_OUTPUTS,ECOMMERCE_STEPS,ECOMMERCE_LIMITS} from "@/lib/workflows/ecommerceProductPackPlan";

const ALLOWED=["image/jpeg","image/png","image/webp"];
function sizeLabel(bytes) {return bytes<1048576 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1048576).toFixed(2)} MB`;}
export default function EcommerceProductPackWorkspace() {
  const [file,setFile]=useState(null);
  const [inputUrl,setInputUrl]=useState("");
  const [outputUrls,setOutputUrls]=useState([]);
  const [settings,setSettings]=useState({productName:"Product photo",altText:"Square photo of the product",watermarkText:"",focusX:50,focusY:50});
  const [busy,setBusy]=useState(false);
  const [steps,setSteps]=useState({});
  const [result,setResult]=useState(null);
  const [error,setError]=useState("");
  const inputRef=useRef("");
  const outputRef=useRef([]);
  const controllerRef=useRef(null);
  const running=useRef(false);
  useEffect(()=>()=>{
    controllerRef.current?.abort();
    if (inputRef.current) URL.revokeObjectURL(inputRef.current);
    outputRef.current.forEach(url=>URL.revokeObjectURL(url));
  },[]);
  function clearOutput() {
    outputRef.current.forEach(url=>URL.revokeObjectURL(url));outputRef.current=[];
    setOutputUrls([]);setResult(null);setSteps({});
  }
  function choose(event) {
    const chosen=event.target.files?.[0];event.target.value="";
    if (!chosen || running.current) return;
    if (!ALLOWED.includes(chosen.type) || chosen.size<1 || chosen.size>ECOMMERCE_LIMITS.maxInputBytes) {
      setError("Choose a non-empty JPG, PNG or WebP file up to 10 MB.");return;
    }
    const url=URL.createObjectURL(chosen);
    if (inputRef.current) URL.revokeObjectURL(inputRef.current);
    inputRef.current=url;setInputUrl(url);setFile(chosen);clearOutput();setError("");
  }
  function update(key,value) {
    if (running.current) return;
    setSettings(current=>({...current,[key]:value}));clearOutput();setError("");
  }
  async function process(event) {
    event.preventDefault();
    if (!file || running.current) return;
    running.current=true;setBusy(true);clearOutput();setError("");
    const controller=new AbortController();controllerRef.current=controller;
    try {
      const next=await runEcommerceProductPack(file,settings,{
        signal:controller.signal,
        onStep:({id,status,variant})=>setSteps(current=>({...current,[`${variant}-${id}`]:status})),
      });
      if (!controller.signal.aborted) {
        const urls=next.outputs.map(item=>URL.createObjectURL(item.blob));
        outputRef.current=urls;setOutputUrls(urls);setResult(next);
      }
    } catch(caught) {
      setError(controller.signal.aborted ? "Workflow cancelled; no product pack available." :
        caught instanceof Error ? caught.message : "Product photo processing failed.");
    } finally {running.current=false;controllerRef.current=null;setBusy(false);}
  }
  function downloadMetadata() {
    if (!result) return;
    const url=URL.createObjectURL(result.metadata.blob);
    const link=document.createElement("a");link.href=url;link.download=result.metadata.filename;
    document.body.appendChild(link);link.click();link.remove();
    // Revoke after the click has finished without retaining metadata object URLs in UI state.
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.92fr)]">
      <form onSubmit={process} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={21} aria-hidden="true" />
          <div><p className="font-semibold text-foreground">Product image pack • browser-local beta</p>
            <p className="mt-1 text-sm leading-6 text-muted">Two JPG/PNG/WebP images and one metadata text file.
              No AI credits, background removal, API calls, cloud uploads or marketplace posting.</p></div>
        </div>
        <label htmlFor="ecommerce-source" className="mt-6 block text-sm font-semibold text-foreground">Product image</label>
        <label htmlFor="ecommerce-source" className={`mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-4 text-sm font-semibold ${busy?"pointer-events-none opacity-50":"hover:border-primary"}`}>
          <Upload size={18} aria-hidden="true" /> {file?"Choose another photo":"Select JPG, PNG or WebP"}
        </label>
        <input id="ecommerce-source" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={choose} />
        <p className="mt-2 text-xs text-muted">10 MB maximum, at least 1200 × 1200 px. Keeps the original aspect ratio by making a centered square crop; no upscaling.</p>
        {file && <p className="mt-2 break-all text-xs text-muted">{file.name} • {sizeLabel(file.size)}</p>}
        {inputUrl && <div className="relative mt-3 h-44 overflow-hidden rounded-xl bg-slate-50"><Image src={inputUrl} alt="Uploaded product photo" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" /></div>}
        <fieldset disabled={busy} className="mt-6 space-y-4">
          <legend className="font-semibold text-foreground">Listing details</legend>
          <label className="block text-sm font-semibold text-foreground">Product name
            <input value={settings.productName} maxLength={90} onChange={e=>update("productName",e.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" /></label>
          <label className="block text-sm font-semibold text-foreground">Image alt text
            <textarea value={settings.altText} rows={2} maxLength={180} onChange={e=>update("altText",e.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-foreground" /></label>
          <label className="block text-sm font-semibold text-foreground">Optional text watermark
            <input value={settings.watermarkText} maxLength={50} placeholder="Leave blank for no watermark" onChange={e=>update("watermarkText",e.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" /></label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[{key:"focusX",name:"Horizontal"},{key:"focusY",name:"Vertical"}].map(item=>(
              <label key={item.key} className="text-sm font-semibold text-foreground">{item.name} crop focus: {settings[item.key]}%
                <input type="range" min="0" max="100" step="10" value={settings[item.key]} onChange={e=>update(item.key,Number(e.target.value))}
                  className="mt-2 w-full accent-indigo-600" /></label>
            ))}
          </div>
        </fieldset>
        <button disabled={!file||busy} type="submit" className="mt-6 min-h-12 w-full rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">
          {busy?"Preparing product pack...":"Create Product Pack"}
        </button>
        {busy && <button type="button" onClick={()=>controllerRef.current?.abort()} className="mt-2 min-h-10 w-full rounded-lg border border-border text-sm text-foreground">Cancel</button>}
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 p-3 text-sm text-red-600">{error}</p>}
      </form>
      <div className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Planned workflow</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Both sizes run Crop → Resize → optional Watermark using existing tools.</p>
        <div className="mt-4 space-y-4">{ECOMMERCE_OUTPUTS.map(target=>(
          <div key={target.id} className="rounded-xl border border-border p-4">
            <p className="font-semibold text-foreground">{target.label} • {target.size} × {target.size}</p>
            <ol className="mt-3 space-y-2">{ECOMMERCE_STEPS.map((id,index)=>(
              <li key={id} className="text-sm text-muted">{index+1}. {({"IMG-08":"Crop square","IMG-03":"Resize for listing","IMG-12":"Text watermark (optional)"})[id]}
                {steps[`${target.id}-${id}`] ? ` — ${steps[`${target.id}-${id}`]}` : ""}</li>
            ))}</ol>
            {result && <div className="mt-4">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-slate-50">
                <Image src={outputUrls[ECOMMERCE_OUTPUTS.findIndex(item=>item.id===target.id)]} alt={`${target.label} preview`} fill unoptimized sizes="(max-width: 1024px) 100vw, 350px" className="object-contain" />
              </div>
              <a href={outputUrls[ECOMMERCE_OUTPUTS.findIndex(item=>item.id===target.id)]}
                download={result.outputs.find(item=>item.variant===target.id)?.filename}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 font-semibold text-white"><Download size={18} aria-hidden="true" /> Download {target.id}</a>
            </div>}
          </div>
        ))}</div>
        {result && <button type="button" onClick={downloadMetadata}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 font-semibold text-primary"><Download size={18} aria-hidden="true" /> Download product metadata TXT</button>}
        <p className="mt-4 text-xs leading-5 text-muted">Output files are downloaded individually (not a ZIP). Clean-background AI, batch export and live marketplace validation are planned, not included.</p>
      </div>
    </div>
  );
}
