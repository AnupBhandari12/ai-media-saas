"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {Download, Upload, ShieldCheck, XCircle} from "lucide-react";
import {runYouTubeReady} from "@/lib/workflows/runYouTubeReady";
import {YOUTUBE_TEMPLATES, YOUTUBE_READY_TARGETS, YOUTUBE_READY_LIMITS}
  from "@/lib/workflows/youtubeReadyPlan";

const STEPS = [
  {id:"CRT-04",label:"Create 1280 × 720 JPG thumbnail"},
  {id:"IMG-02",label:"Compress toward chosen KB goal"},
];
function sizeLabel(bytes) {
  return bytes < 1024 ? `${bytes} B` : bytes < 1048576
    ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
}
export default function YouTubeReadyWorkspace() {
  const [file,setFile] = useState(null);
  const [inputUrl,setInputUrl] = useState("");
  const [outputUrl,setOutputUrl] = useState("");
  const [settings,setSettings] = useState({template:"BOLD_LEFT",title:"YOUR VIDEO TITLE",
    subtitle:"",focusX:50,focusY:50,targetKb:2048});
  const [busy,setBusy] = useState(false);
  const [steps,setSteps] = useState({});
  const [result,setResult] = useState(null);
  const [error,setError] = useState("");
  const inputRef = useRef("");
  const outputRef = useRef("");
  const controllerRef = useRef(null);
  const running = useRef(false);
  useEffect(() => () => {
    controllerRef.current?.abort();
    if (inputRef.current) URL.revokeObjectURL(inputRef.current);
    if (outputRef.current) URL.revokeObjectURL(outputRef.current);
  },[]);
  function clearOutput() {
    if (outputRef.current) URL.revokeObjectURL(outputRef.current);
    outputRef.current = "";
    setOutputUrl("");setResult(null);setSteps({});
  }
  function choose(event) {
    const chosen=event.target.files?.[0];event.target.value="";
    if (!chosen || running.current) return;
    if (!["image/jpeg","image/png","image/webp"].includes(chosen.type) ||
        chosen.size < 1 || chosen.size > YOUTUBE_READY_LIMITS.maxInputBytes) {
      setError("Choose a non-empty JPG, PNG or WebP file up to 10 MB.");return;
    }
    const nextUrl = URL.createObjectURL(chosen);
    if (inputRef.current) URL.revokeObjectURL(inputRef.current);
    inputRef.current = nextUrl;setInputUrl(nextUrl);setFile(chosen);
    clearOutput();setError("");
  }
  function update(key,value) {
    if (running.current) return;
    setSettings((current)=>({...current,[key]:value}));
    clearOutput();setError("");
  }
  async function process(event) {
    event.preventDefault();
    if (!file || running.current) return;
    running.current=true;setBusy(true);setError("");clearOutput();
    const controller=new AbortController();controllerRef.current=controller;
    try {
      const next=await runYouTubeReady(file,settings,{
        signal:controller.signal,
        onStep:({id,status})=>setSteps((current)=>({...current,[id]:status})),
      });
      if (!controller.signal.aborted) {
        const nextUrl=URL.createObjectURL(next.blob);
        outputRef.current=nextUrl;setOutputUrl(nextUrl);setResult(next);
      }
    } catch (caught) {
      setError(controller.signal.aborted ? "Workflow stopped; no downloadable thumbnail was created." :
        caught instanceof Error ? caught.message : "Thumbnail processing failed.");
    } finally {
      controllerRef.current=null;running.current=false;setBusy(false);
    }
  }
  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.86fr)]">
      <form onSubmit={process} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={21} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Thumbnail-only • browser-local beta</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Uses the existing Thumbnail Maker and compressor. No logo URL fetch, Brand Kit API,
              video processing, paid AI, uploads or automatic YouTube publishing.
            </p>
          </div>
        </div>

        <label htmlFor="youtube-source" className="mt-6 block text-sm font-semibold text-foreground">Source image</label>
        <label htmlFor="youtube-source" className={`mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-4 text-sm font-semibold text-foreground ${busy ? "pointer-events-none opacity-50" : "hover:border-primary"}`}>
          <Upload size={18} aria-hidden="true" />{file ? "Choose another image" : "Select JPG, PNG or WebP"}
        </label>
        <input id="youtube-source" type="file" accept="image/jpeg,image/png,image/webp"
          className="sr-only" disabled={busy} onChange={choose} />
        {file && <p className="mt-2 break-all text-xs text-muted">{file.name} • {sizeLabel(file.size)}</p>}
        {inputUrl && <div className="relative mt-3 h-44 overflow-hidden rounded-xl bg-slate-50">
          <Image src={inputUrl} alt="Selected source image" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
        </div>}

        <fieldset className="mt-6" disabled={busy}>
          <legend className="font-semibold text-foreground">Thumbnail layout</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {Object.entries(YOUTUBE_TEMPLATES).map(([id,item])=>(
              <label key={id} className={`cursor-pointer rounded-xl border p-3 text-sm ${settings.template===id?"border-primary bg-primary/10 text-primary":"border-border bg-background text-foreground"}`}>
                <input type="radio" name="youtube-layout" className="mr-2 accent-current" checked={settings.template===id}
                  onChange={()=>update("template",id)} />
                <span className="font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs">{item.help}</span>
              </label>
            ))}
          </div>
          <label htmlFor="youtube-title" className="mt-5 block text-sm font-semibold text-foreground">Thumbnail headline</label>
          <input id="youtube-title" maxLength={100} minLength={3} required value={settings.title}
            onChange={(event)=>update("title",event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary" />
          <label htmlFor="youtube-subtitle" className="mt-4 block text-sm font-semibold text-foreground">Optional subtitle</label>
          <input id="youtube-subtitle" maxLength={140} value={settings.subtitle}
            onChange={(event)=>update("subtitle",event.target.value)}
            className="mt-2 min-h-12 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground focus:border-primary" />
          {[["focusX","Horizontal focus"],["focusY","Vertical focus"]].map(([field,label])=>(
            <label key={field} className="mt-4 block text-sm font-semibold text-foreground">
              <span className="flex justify-between"><span>{label}</span><span>{settings[field]}%</span></span>
              <input type="range" min={0} max={100} step={5} value={settings[field]}
                onChange={(event)=>update(field,Number(event.target.value))}
                className="mt-2 w-full accent-indigo-600" />
            </label>
          ))}
        </fieldset>
        <fieldset disabled={busy} className="mt-5">
          <legend className="text-sm font-semibold text-foreground">Output size goal (best effort)</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {YOUTUBE_READY_TARGETS.map((value)=>(
              <label key={value} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold ${settings.targetKb===value?"border-primary bg-primary/10 text-primary":"border-border bg-background text-foreground"}`}>
                <input type="radio" name="youtube-target" className="sr-only" checked={settings.targetKb===value}
                  onChange={()=>update("targetKb",value)}/>{value>=1024?`${value/1024} MB`:`${value} KB`}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-muted">
          Thumbnail Maker crops the background image to the fixed 16:9 frame; important content near edges may be cut.
          If compression would alter 1280 × 720 dimensions, this beta blocks the output rather than silently resizing.
        </p>
        <button type="submit" disabled={!file || busy || settings.title.trim().length<3}
          className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy?"Preparing thumbnail...":"Create YouTube Thumbnail"}
        </button>
        {busy && <button type="button" onClick={()=>controllerRef.current?.abort()}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground">
          <XCircle size={17} aria-hidden="true" /> Stop after current step
        </button>}
      </form>
      <section aria-live="polite" className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Workflow progress</h2>
        <p className="mt-2 text-sm leading-6 text-muted">WF-05 approved thumbnail path: CRT-04 → IMG-02.</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((item,index)=>{
            const status=steps[item.id]||"PENDING";
            return <li key={item.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index+1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-muted">{item.id} • {status.toLowerCase()}</p>
              </div>
            </li>;
          })}
        </ol>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {result && outputUrl ? <div className="mt-6 border-t border-border pt-5">
          <h3 className="font-semibold text-foreground">Review thumbnail before uploading</h3>
          <div className="relative mt-4 h-64 overflow-hidden rounded-xl bg-slate-50">
            <Image src={outputUrl} alt="Prepared YouTube thumbnail" fill unoptimized sizes="(max-width:1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Source</dt><dd className="font-semibold text-foreground">{sizeLabel(result.original.bytes)}</dd></div>
            <div><dt className="text-muted">Output</dt><dd className="font-semibold text-foreground">{sizeLabel(result.result.bytes)}</dd></div>
            <div><dt className="text-muted">Dimensions</dt><dd className="font-semibold text-foreground">1280 × 720</dd></div>
            <div><dt className="text-muted">Format</dt><dd className="font-semibold text-foreground">JPG</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted">
            Target {result.config.targetKb} KB: {result.result.reachedTarget ? "Reached" : "Not reached"}.
            Platform upload acceptance is not verified.
          </p>
          <a href={outputUrl} download={result.filename}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={18} aria-hidden="true" /> Download {result.filename}
          </a>
        </div> : !busy && !error && <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
          Your processed thumbnail and download will appear here.
        </p>}
      </section>
    </div>
  );
}
