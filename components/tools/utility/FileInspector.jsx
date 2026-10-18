"use client";
import {useState} from "react";
import FileDropzone from "@/components/tools/FileDropzone";
import ResultPanel from "@/components/tools/ResultPanel";
import UtilityShell from "./UtilityShell";
import {formatUtilityBytes} from "@/lib/tools/utility/common.mjs";
import {INSPECTOR_MAX_BYTES,inspectFileHeader} from "@/lib/tools/utility/fileInspector.mjs";

async function inspectMedia(file, video){
 const element=document.createElement(video?"video":"audio");
 const url=URL.createObjectURL(file);
 try{
   return await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>finish(null),7000);
     function finish(info){clearTimeout(timeout);element.onloadedmetadata=null;element.onerror=null;
       if(info)resolve(info);else reject(new Error("Media metadata unavailable."));}
     element.onloadedmetadata=()=>finish({duration:Number.isFinite(element.duration)?`${element.duration.toFixed(1)} seconds`:"Unknown",
       ...(video&&element.videoWidth&&element.videoHeight?{dimensions:{width:element.videoWidth,height:element.videoHeight}}:{})});
     element.onerror=()=>finish(null);
     element.preload="metadata";element.src=url;element.load();
   });
 }finally{element.pause();element.removeAttribute("src");element.load();URL.revokeObjectURL(url);}
}

export default function FileInspector(){
 const [info,setInfo]=useState(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function selected(files){const file=files[0];if(!file)return;setBusy(true);setInfo(null);setError("");try{
   if(file.size<1||file.size>INSPECTOR_MAX_BYTES)throw new Error("Choose a file under 20 MiB.");
   const header=new Uint8Array(await file.slice(0,65536).arrayBuffer());
   const data=inspectFileHeader(header,file);
   // Decode only locally, and only with browser-provided parsers.
   if(["PNG image","JPEG image","WebP image","GIF image"].includes(data.detected)){
     const bitmap=await createImageBitmap(file);try{data.dimensions={width:bitmap.width,height:bitmap.height};}finally{bitmap.close();}
   }
   if(data.detected==="PDF document"){
     try{const {loadPdfJs}=await import("@/lib/tools/pdf/pdfJs");const pdfjs=await loadPdfJs();
      const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      try{data.pages=pdf.numPages;}finally{await pdf.destroy();}
     }catch{data.pages="Unable to read pages (possibly encrypted/damaged)";}
   }
   if(["WAV audio","MP3 audio","MP4-family media","WebM / Matroska media"].includes(data.detected)){
     try{Object.assign(data,await inspectMedia(file,["MP4-family media","WebM / Matroska media"].includes(data.detected)));}
     catch{data.duration="Unavailable (unsupported or invalid media)";}
   }
   setInfo(data);
  }catch(e){setError(e.message||"Cannot inspect this file.");}finally{setBusy(false);}
 }
 const result=info?<ResultPanel title="File inspection" description="Detected using file headers. A format match does not prove that a file is safe." metadata={[
 {label:"Name",value:info.name},{label:"Size",value:formatUtilityBytes(info.size)},
 {label:"Detected",value:info.detected},{label:"Declared MIME",value:info.claimedMime},
 {label:"Last modified",value:info.modified},
 ...(info.dimensions?[{label:"Dimensions",value:`${info.dimensions.width} × ${info.dimensions.height}`}]:[]),
 ...(info.pages?[{label:"PDF pages",value:info.pages}]:[]),
 ...(info.duration?[{label:"Media duration",value:info.duration}]:[]),
 {label:"EXIF marker",value:info.exifMarker?"Present: may contain sensitive metadata":"Not detected in sampled header"},
 ]}/>:null;
 return <UtilityShell toolId="UTL-08" title="File Inspector" description="Inspect size, signature, dimensions, PDF page count and a basic EXIF indicator without uploading." error={error} result={result}>
  <FileDropzone maxSizeBytes={INSPECTOR_MAX_BYTES} disabled={busy} onFilesSelected={selected} title="Choose a file" description="Reads local file headers only (PDF page count requires parsing the PDF). Max 20 MiB." />
  <p className="text-xs text-muted">Never opens embedded scripts, macros or archives. A known file signature is not a malware scan. Unknown types are reported safely.</p>
 </UtilityShell>;
}
