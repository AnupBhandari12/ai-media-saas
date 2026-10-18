/* eslint-disable @next/next/no-img-element -- Local object URL preview with strict image MIME */
"use client";
import {useEffect,useRef,useState} from "react";
import FileDropzone from "@/components/tools/FileDropzone";
import ResultPanel from "@/components/tools/ResultPanel";
import UtilityShell,{fieldClass,primaryClass,secondaryClass} from "./UtilityShell";
import {validateUtilityImage,assertImageDimensions} from "@/lib/tools/utility/common.mjs";
import {defaultCorners} from "@/lib/tools/utility/scannerMath.mjs";

export default function DocumentScanner(){
 const [file,setFile]=useState(null),[corners,setCorners]=useState(defaultCorners),[appearance,setAppearance]=useState("ENHANCE"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[result,setResult]=useState(null);
 const canvas=useRef(null),bitmap=useRef(null),drag=useRef(-1),cornersRef=useRef(corners);
 useEffect(()=>{cornersRef.current=corners;},[corners]);
 useEffect(()=>()=>{bitmap.current?.close();},[]);
 useEffect(()=>()=>{if(result?.image)URL.revokeObjectURL(result.image);if(result?.pdf)URL.revokeObjectURL(result.pdf);},[result]);
 useEffect(()=>{
  if(!file)return;let disposed=false;let next=null;
  (async()=>{try{next=await createImageBitmap(file);assertImageDimensions(next.width,next.height);if(disposed){next.close();return;}bitmap.current?.close();bitmap.current=next;draw();}catch(e){if(!disposed)setError(e.message);}})();
  return()=>{disposed=true;};
 },[file]);
 function draw(){const b=bitmap.current,c=canvas.current;if(!b||!c)return;
  const scale=Math.min(1,480/b.width,560/b.height);c.width=Math.max(1,Math.round(b.width*scale));c.height=Math.max(1,Math.round(b.height*scale));
  const ctx=c.getContext("2d");ctx.drawImage(b,0,0,c.width,c.height);
  ctx.strokeStyle="#16a34a";ctx.lineWidth=3;ctx.beginPath();
  cornersRef.current.forEach((p,i)=>{if(!i)ctx.moveTo(p[0]*c.width,p[1]*c.height);else ctx.lineTo(p[0]*c.width,p[1]*c.height);});ctx.closePath();ctx.stroke();
  cornersRef.current.forEach((p,i)=>{ctx.beginPath();ctx.arc(p[0]*c.width,p[1]*c.height,9,0,Math.PI*2);ctx.fillStyle="#fff";ctx.fill();ctx.strokeStyle="#166534";ctx.lineWidth=3;ctx.stroke();});
 }
 useEffect(()=>{draw();},[corners,file]);
 function onSelected(files){try{validateUtilityImage(files[0],10*1024*1024);setFile(files[0]);setCorners(defaultCorners());setResult(null);setError("");}catch(e){setFile(null);setError(e.message);}}
 function point(e){const rect=canvas.current.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))];}
 function pointerDown(e){const p=point(e);const distances=cornersRef.current.map(c=>Math.hypot(c[0]-p[0],c[1]-p[1]));const min=Math.min(...distances);if(min>.15)return;drag.current=distances.indexOf(min);e.currentTarget.setPointerCapture(e.pointerId);}
 function pointerMove(e){if(drag.current<0)return;const p=point(e);setCorners(prev=>prev.map((c,i)=>i===drag.current?p:c));setResult(null);}
 function pointerUp(){drag.current=-1;}
 async function run(){if(!file||busy)return;setBusy(true);setError("");setResult(null);try{
  const {createDocumentScan}=await import("@/lib/tools/utility/documentScan");const scanned=await createDocumentScan(file,corners,appearance);
  const {createScannedPdfFromImages}=await import("@/lib/tools/pdf/createScannedPdfFromImages");
  const photo=new File([scanned.blob],"scanned.jpg",{type:"image/jpeg"});
  const pdf=await createScannedPdfFromImages([photo],{mode:"ORIGINAL",pageSize:"A4",margin:24});
  setResult({image:URL.createObjectURL(scanned.blob),pdf:URL.createObjectURL(pdf.blob),size:`${scanned.width} × ${scanned.height}`});
 }catch(e){setError(e.message||"Scanning failed.");}finally{setBusy(false);}}
 const resultUi=result?<div className="space-y-3"><ResultPanel title="Document scan ready" description="Review the crop and readability before sharing." metadata={[{label:"Resolution",value:result.size}]}/><img src={result.image} alt="Scanned document preview" className="max-h-96 w-full rounded-xl border border-border object-contain"/><div className="flex flex-wrap gap-2"><a className={primaryClass} download="scanned-document.jpg" href={result.image}>Download JPG</a><a className={secondaryClass} download="scanned-document.pdf" href={result.pdf}>Download PDF</a></div></div>:null;
 return <UtilityShell toolId="UTL-04" title="Document Scanner" description="Use your camera or upload a document photo. Drag the four corners for perspective correction." error={error} result={resultUi}>
  <FileDropzone accept="image/jpeg,image/png,image/webp" maxSizeBytes={10*1024*1024} disabled={busy} onFilesSelected={onSelected} title="Choose a document photo" />
  <label className={`block ${secondaryClass} text-center`}>Open camera / choose photo<input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={e=>{if(e.target.files.length)onSelected(Array.from(e.target.files));e.target.value="";}} /></label>
  {file&&<><p className="text-sm text-muted">Drag each circular corner. Green border indicates selected area.</p><canvas ref={canvas} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className="h-auto max-w-full touch-none rounded-xl border border-border" aria-label="Drag the four document corners"/><button className={secondaryClass} onClick={()=>{setCorners(defaultCorners());setResult(null);}}>Reset corners</button>
  <div><label htmlFor="scanner-mode">Appearance</label><select id="scanner-mode" className={fieldClass} value={appearance} onChange={e=>{setAppearance(e.target.value);setResult(null)}}><option value="ENHANCE">Enhanced black/white</option><option value="GRAYSCALE">Grayscale</option><option value="COLOR">Color</option></select></div></>}
  <button className={`${primaryClass} w-full`} onClick={run} disabled={!file||busy}>{busy?"Scanning...":"Create scan (JPG + PDF)"}</button>
 </UtilityShell>;
}
