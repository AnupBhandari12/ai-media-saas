"use client";

import {useEffect,useRef,useState} from "react";
import {ArrowDown,ArrowUp,Download,FileText,ShieldCheck,Trash2,Upload} from "lucide-react";
import {runStudentNotesPack} from "@/lib/workflows/runStudentNotesPack";
import {STUDENT_NOTES_LIMITS,STUDENT_NOTES_STEPS,validateStudentNotesFiles}
  from "@/lib/workflows/studentNotesPackPlan";

const ACCEPT="image/jpeg,image/png,image/webp";
function labelBytes(bytes) {return bytes<1048576?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1048576).toFixed(2)} MB`;}
export default function StudentNotesPackWorkspace() {
  const [files,setFiles]=useState([]);
  const [settings,setSettings]=useState({title:"My study notes",mode:"ENHANCE",pageSize:"A4",startNumber:1});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [progress,setProgress]=useState({});
  const [output,setOutput]=useState(null);
  const [pdfUrl,setPdfUrl]=useState("");
  const [sourcesUrl,setSourcesUrl]=useState("");
  const urls=useRef({pdf:"",sources:""});
  const controller=useRef(null);
  const running=useRef(false);
  useEffect(()=>()=>{
    controller.current?.abort();
    if(urls.current.pdf) URL.revokeObjectURL(urls.current.pdf);
    if(urls.current.sources) URL.revokeObjectURL(urls.current.sources);
  },[]);
  function clearOutput() {
    if(urls.current.pdf) URL.revokeObjectURL(urls.current.pdf);
    if(urls.current.sources) URL.revokeObjectURL(urls.current.sources);
    urls.current={pdf:"",sources:""};setPdfUrl("");setSourcesUrl("");setOutput(null);setProgress({});
  }
  function addFiles(event) {
    const incoming=Array.from(event.target.files??[]);event.target.value="";
    if(!incoming.length||running.current) return;
    const combined=[...files,...incoming];
    try {validateStudentNotesFiles(combined);setFiles(combined);clearOutput();setError("");}
    catch(caught){setError(caught instanceof Error?caught.message:"Invalid note photos.");}
  }
  function moveFile(index,direction) {
    if(running.current)return;
    const target=index+direction;
    if(target<0||target>=files.length)return;
    const next=[...files];[next[index],next[target]]=[next[target],next[index]];
    setFiles(next);clearOutput();setError("");
  }
  function removeFile(index) {
    if(running.current)return;
    setFiles(items=>items.filter((_,i)=>i!==index));clearOutput();setError("");
  }
  function updateSetting(key,value) {
    if(running.current)return;
    setSettings(prev=>({...prev,[key]:value}));clearOutput();setError("");
  }
  async function process(event) {
    event.preventDefault();
    if(!files.length||running.current)return;
    running.current=true;setBusy(true);clearOutput();setError("");
    const active=new AbortController();controller.current=active;
    try {
      const result=await runStudentNotesPack(files,settings,{
        signal:active.signal,
        onStep:event=>setProgress(prev=>({...prev,[event.id]:event.status})),
      });
      if(active.signal.aborted)return;
      const nextPdf=URL.createObjectURL(result.blob);
      const nextSources=URL.createObjectURL(result.sources.blob);
      urls.current={pdf:nextPdf,sources:nextSources};setPdfUrl(nextPdf);setSourcesUrl(nextSources);setOutput(result);
    } catch(caught) {
      setError(active.signal.aborted?"Workflow cancelled; no files ready to download.":
        caught instanceof Error?caught.message:"Could not create the Student Notes PDF.");
    } finally {controller.current=null;running.current=false;setBusy(false);}
  }
  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
      <form onSubmit={process} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck size={21} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div><p className="font-semibold text-foreground">Study photos → numbered PDF • local beta</p>
            <p className="mt-1 text-sm leading-6 text-muted">No upload, AI provider, OCR or credit charge. Photo pages stay images in the PDF.</p></div>
        </div>
        <label htmlFor="student-photos" className={`mt-6 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-4 text-sm font-semibold text-foreground ${busy?"pointer-events-none opacity-50":"hover:border-primary"}`}>
          <Upload size={18} aria-hidden="true" /> Add study note photos (JPG, PNG, WebP)
        </label>
        <input id="student-photos" type="file" multiple accept={ACCEPT} onChange={addFiles} disabled={busy}
          className="sr-only" />
        <p className="mt-2 text-xs leading-5 text-muted">1–15 photos, max 10 MB each, 50 MB combined. Use the arrows to choose PDF page order. First PDF export may take a moment.</p>
        {files.length>0&&<div className="mt-5 rounded-xl border border-border p-4">
          <h2 className="font-semibold text-foreground">Page order ({files.length}/{STUDENT_NOTES_LIMITS.maxFiles})</h2>
          <ol className="mt-3 space-y-2">{files.map((file,index)=>(
            <li key={`${index}-${file.name}-${file.size}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-background px-3 py-2">
              <span className="shrink-0 text-sm font-semibold text-primary">{index+1}.</span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={file.name}>{file.name}
                <span className="ml-2 text-xs text-muted">{labelBytes(file.size)}</span></span>
              <button disabled={busy||index===0} type="button" onClick={()=>moveFile(index,-1)}
                aria-label={`Move page ${index+1} up`} className="rounded-lg border border-border p-2 disabled:opacity-30"><ArrowUp size={16}/></button>
              <button disabled={busy||index===files.length-1} type="button" onClick={()=>moveFile(index,1)}
                aria-label={`Move page ${index+1} down`} className="rounded-lg border border-border p-2 disabled:opacity-30"><ArrowDown size={16}/></button>
              <button disabled={busy} type="button" onClick={()=>removeFile(index)}
                aria-label={`Remove page ${index+1}`} className="rounded-lg border border-border p-2 text-red-600 disabled:opacity-30"><Trash2 size={16}/></button>
            </li>
          ))}</ol>
        </div>}
        <fieldset disabled={busy} className="mt-6 space-y-4">
          <legend className="font-semibold text-foreground">PDF settings</legend>
          <label className="block text-sm font-semibold text-foreground">Notes title
            <input value={settings.title} maxLength={90} onChange={e=>updateSetting("title",e.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" /></label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-foreground">Page appearance
              <select value={settings.mode} onChange={e=>updateSetting("mode",e.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground">
                <option value="ENHANCE">Document enhance</option><option value="GRAYSCALE">Grayscale</option><option value="ORIGINAL">Original colors</option>
              </select></label>
            <label className="text-sm font-semibold text-foreground">PDF layout
              <select value={settings.pageSize} onChange={e=>updateSetting("pageSize",e.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground">
                <option value="A4">A4 portrait / landscape</option><option value="FIT">Fit source aspect</option>
              </select></label>
            <label className="text-sm font-semibold text-foreground">Start page numbering
              <input type="number" min="1" max="9999" step="1" value={settings.startNumber}
                onChange={e=>updateSetting("startNumber",Number(e.target.value))}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" /></label>
          </div>
        </fieldset>
        <button disabled={!files.length||busy} type="submit" className="mt-6 min-h-12 w-full rounded-xl bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">
          {busy?"Creating your study PDF...":"Create Numbered Study PDF"}
        </button>
        {busy&&<button type="button" onClick={()=>controller.current?.abort()}
          className="mt-2 min-h-10 w-full rounded-lg border border-border text-sm text-foreground">Cancel after current PDF step</button>}
        {error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 p-3 text-sm text-red-600">{error}</p>}
      </form>
      <aside className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Approved processing plan</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Existing browser PDF tools are reused. Your input order becomes PDF page order.</p>
        <ol className="mt-4 space-y-3">{STUDENT_NOTES_STEPS.map((step,index)=>(
          <li key={step} className="rounded-xl border border-border p-4">
            <p className="font-semibold text-foreground">{index+1}. {step==="PDF-17"?"Scan Photos to PDF":"Add Page Numbers"}</p>
            <p className="mt-1 text-xs text-muted">{step} · {progress[step]??"Pending"}</p>
          </li>
        ))}</ol>
        {output&&<div className="mt-5 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="font-semibold text-foreground">Study pack ready: {output.pageCount} pages</p>
          <p className="text-xs text-muted">PDF: {labelBytes(output.outputBytes)} · Source index maps each PDF page to the original photo.</p>
          <a href={pdfUrl} download={output.filename} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"><Download size={18}/> Download numbered PDF</a>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"><FileText size={18}/> Open PDF preview</a>
          <a href={sourcesUrl} download={output.sources.filename} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary"><Download size={18}/> Download source index TXT</a>
        </div>}
        <p className="mt-5 text-xs leading-6 text-muted">Source mapping is page-to-photo only. It is not OCR, transcription or AI-generated notes. The OCR workflow is preview-only; the separate <a className="font-semibold text-primary underline" href="/tools/pdf/ocr">PDF OCR tool</a> can be used on a scan when readable text is needed.</p>
      </aside>
    </div>
  );
}
