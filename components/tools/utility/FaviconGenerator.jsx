"use client";
import {useEffect,useState} from "react";
import FileDropzone from "@/components/tools/FileDropzone";
import ResultPanel from "@/components/tools/ResultPanel";
import UtilityShell,{primaryClass} from "./UtilityShell";
import {validateUtilityImage,assertImageDimensions} from "@/lib/tools/utility/common.mjs";
import {ICON_SIZES,makePngIco} from "@/lib/tools/utility/faviconRules.mjs";

function pngOf(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Could not render favicon.")),"image/png"));}
export default function FaviconGenerator(){
 const [file,setFile]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[zipUrl,setZipUrl]=useState(""),[count,setCount]=useState(0);
 useEffect(()=>()=>{if(zipUrl)URL.revokeObjectURL(zipUrl)},[zipUrl]);
 function selected(fs){try{validateUtilityImage(fs[0],8*1024*1024);setFile(fs[0]);setError("");setZipUrl("");}catch(e){setFile(null);setError(e.message);}}
 async function generate(){if(!file||busy)return;setBusy(true);setError("");setZipUrl("");let bitmap;
  try{
   bitmap=await createImageBitmap(file);assertImageDimensions(bitmap.width,bitmap.height);
   const mod=await import("jszip");const Zip=mod.default||mod;const archive=new Zip();let png32=null;
   for(const size of ICON_SIZES){const canvas=document.createElement("canvas");canvas.width=canvas.height=size;
    const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas unavailable.");
    ctx.clearRect(0,0,size,size);const scale=Math.min((size*.9)/bitmap.width,(size*.9)/bitmap.height);
    const w=bitmap.width*scale,h=bitmap.height*scale;ctx.drawImage(bitmap,(size-w)/2,(size-h)/2,w,h);
    const blob=await pngOf(canvas);archive.file(size===180?"apple-touch-icon.png":size===192?"android-chrome-192x192.png":size===512?"android-chrome-512x512.png":`favicon-${size}x${size}.png`,blob);
    if(size===32)png32=new Uint8Array(await blob.arrayBuffer());
   }
   archive.file("favicon.ico",makePngIco(png32));
   archive.file("README.txt","Copy favicon.ico and PNG files into your website's public directory. Test the icons on desktop and phone.\n");
   const out=await archive.generateAsync({type:"blob",compression:"DEFLATE"});
   if(out.size>20*1024*1024)throw new Error("Icon ZIP is too large.");
   setZipUrl(URL.createObjectURL(out));setCount(7);
  }catch(e){setError(e.message||"Favicon generation failed.");}finally{bitmap?.close();setBusy(false);}
 }
 return <UtilityShell toolId="UTL-06" title="Favicon / App Icon Generator" description="Convert your logo into standard website and app icon sizes; download everything in a ZIP." error={error} result={zipUrl?<div className="space-y-3"><ResultPanel title="Icon ZIP ready" description="Includes PNG sizes and favicon.ico" metadata={[{label:"Files",value:String(count)+" icons + README"}]}/><a className={primaryClass} href={zipUrl} download="ai-media-favicons.zip">Download icon ZIP</a></div>:null}>
  <FileDropzone accept="image/jpeg,image/png,image/webp" maxSizeBytes={8*1024*1024} onFilesSelected={selected} disabled={busy} title="Upload a logo" description="JPG/PNG/WebP · up to 8 MiB. Transparent PNG recommended."/>
  {file&&<p className="break-all text-sm">{file.name}</p>}
  <p className="text-sm text-muted">Includes 16, 32, 48, 180, 192 and 512 px icons and a favicon.ico.</p>
  <button onClick={generate} disabled={!file||busy} className={`${primaryClass} w-full`}>{busy?"Creating icons...":"Generate favicon ZIP"}</button>
 </UtilityShell>;
}
