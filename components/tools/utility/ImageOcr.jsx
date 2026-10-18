"use client";
import { useEffect, useRef, useState } from "react";
import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import ResultPanel from "@/components/tools/ResultPanel";
import UtilityShell, { fieldClass, primaryClass, secondaryClass } from "./UtilityShell";
import { validateUtilityImage, safeUtilityFilename } from "@/lib/tools/utility/common.mjs";
import { OCR_IMAGE_LANGUAGES } from "@/lib/tools/utility/ocrRules.mjs";

export default function ImageOcr() {
  const [file,setFile]=useState(null),[language,setLanguage]=useState("eng"),[progress,setProgress]=useState(0),[stage,setStage]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState(null);
  const current=useRef(null),generation=useRef(0);
  useEffect(()=>()=>{generation.current+=1;void current.current?.cancel();},[]);
  function select(files){try{validateUtilityImage(files[0],10*1024*1024);setFile(files[0]);setError("");setResult(null);}catch(e){setError(e.message);setFile(null);}}
  async function start(){if(!file||busy)return;const id=++generation.current;setBusy(true);setProgress(0);setError("");setResult(null);
    try{const {createImageOcrRun}=await import("@/lib/tools/utility/imageOcr");if(id!==generation.current)return;
      const controller=createImageOcrRun();current.current=controller;
      const data=await controller.run(file,{language,onProgress:p=>{if(generation.current===id){setStage(p.stage);setProgress(p.progress*100);}}});
      if(generation.current===id)setResult(data);
    }catch(e){if(generation.current===id)setError(e.message||"OCR failed.");}
    finally{if(generation.current===id){setBusy(false);current.current=null;}}
  }
  async function cancel(){generation.current+=1;const old=current.current;current.current=null;setBusy(false);setStage("");setError("OCR cancelled.");if(old)await old.cancel();}
  async function copy(){try{await navigator.clipboard.writeText(result.text);}catch{setError("Clipboard access failed. Select the text to copy manually.");}}
  const url=result?`data:text/plain;charset=utf-8,${encodeURIComponent(result.text)}`:null;
  const display=<div className="space-y-3">
    <ProgressPanel status={busy?"PROCESSING":error?"ERROR":result?"SUCCESS":"IDLE"} progress={progress} message={busy?stage:error||"Choose an image to extract text."}/>
    {result&&<><ResultPanel title="Recognized text" description="Review spelling and formatting. OCR can make mistakes." metadata={[{label:"Language",value:result.languageLabel},{label:"Words",value:result.words},{label:"Confidence (estimate)",value:`${result.confidence}%`}]}><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-4 text-sm">{result.text}</pre></ResultPanel><div className="flex flex-wrap gap-2"><button className={secondaryClass} onClick={copy}>Copy text</button><a className={primaryClass} href={url} download={safeUtilityFilename(file?.name||"image", ".txt").replace(/\.txt$/, "-ocr.txt")}>Download .txt</a></div></>}
  </div>;
  return <UtilityShell toolId="UTL-03" title="Image to Text OCR" description="Read text from screenshots and photos locally. Language models may download on the first use." error={error} result={display}>
    <FileDropzone accept="image/jpeg,image/png,image/webp" maxSizeBytes={10*1024*1024} disabled={busy} onFilesSelected={select} title="Choose an image" description="JPG, PNG or WebP · maximum 10 MiB"/>
    {file&&<p className="break-all text-sm">{file.name}</p>}
    <div><label htmlFor="ocr-lang" className="text-sm font-medium">OCR language</label><select className={fieldClass} id="ocr-lang" value={language} onChange={e=>setLanguage(e.target.value)} disabled={busy}>{Object.entries(OCR_IMAGE_LANGUAGES).map(([key,v])=><option key={key} value={key}>{v.label}</option>)}</select></div>
    <div className="flex flex-wrap gap-2"><button className={`${primaryClass} flex-1`} disabled={!file||busy} onClick={start}>{busy?"Working...":"Extract text"}</button>{busy&&<button className={secondaryClass} onClick={cancel}>Cancel OCR</button>}</div>
    <p className="text-xs text-muted">No image upload. Initial language downloads require internet. Cancel terminates the local OCR worker.</p>
  </UtilityShell>;
}
