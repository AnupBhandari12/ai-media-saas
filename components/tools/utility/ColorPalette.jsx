"use client";
import {useEffect,useRef,useState}from"react";
import FileDropzone from "@/components/tools/FileDropzone";
import ResultPanel from "@/components/tools/ResultPanel";
import UtilityShell,{secondaryClass}from"./UtilityShell";
import {validateUtilityImage,assertImageDimensions}from"@/lib/tools/utility/common.mjs";
import {rgbToHex,dominantPalette}from"@/lib/tools/utility/paletteRules.mjs";

export default function ColorPalette(){
 const [file,setFile]=useState(null),[error,setError]=useState(""),[colors,setColors]=useState([]),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false);const canvas=useRef(null);
 async function load(files){const f=files[0];try{validateUtilityImage(f);setBusy(true);setError("");const bmp=await createImageBitmap(f);try{assertImageDimensions(bmp.width,bmp.height);const scale=Math.min(1,750/bmp.width,750/bmp.height);
    const c=canvas.current;c.width=Math.round(bmp.width*scale);c.height=Math.round(bmp.height*scale);const ctx=c.getContext("2d",{willReadFrequently:true});ctx.drawImage(bmp,0,0,c.width,c.height);
    setColors(dominantPalette(ctx.getImageData(0,0,c.width,c.height).data));setSelected(null);setFile(f);
   }finally{bmp.close();}
 }catch(e){setError(e.message||"Unable to inspect image.");}finally{setBusy(false);}}
 function pick(e){const c=canvas.current,rect=c.getBoundingClientRect();const x=Math.max(0,Math.min(c.width-1,Math.floor((e.clientX-rect.left)/rect.width*c.width))),y=Math.max(0,Math.min(c.height-1,Math.floor((e.clientY-rect.top)/rect.height*c.height)));
  const d=c.getContext("2d").getImageData(x,y,1,1).data;setSelected({hex:rgbToHex(d[0],d[1],d[2]),rgb:`rgb(${d[0]}, ${d[1]}, ${d[2]})`});}
 async function copy(value){try{await navigator.clipboard.writeText(value)}catch{setError("Clipboard unavailable. Select color text and copy manually.");}}
 const result=(file&&colors.length)?<div className="space-y-3"><ResultPanel title="Image palette" description="Click the image to sample any pixel. Palette colors are approximate."/>
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[...(selected?[selected]:[]),...colors].map((c,i)=><button type="button" key={i} className="rounded-xl border border-border p-2 text-left" onClick={()=>copy(c.hex)}><span className="block h-12 rounded-lg" style={{backgroundColor:c.hex}}/><span className="mt-2 block text-xs font-bold">{c.hex}</span><span className="block text-xs text-muted">{c.rgb}</span></button>)}</div><p className="text-xs text-muted">Tap a swatch to copy its HEX value.</p></div>:null;
 return <UtilityShell toolId="UTL-05" title="Color Picker / Palette" description="Sample colors from an image and copy HEX or RGB values." error={error} result={result}>
  <FileDropzone accept="image/jpeg,image/png,image/webp" maxSizeBytes={12*1024*1024} onFilesSelected={load} title="Choose an image" disabled={busy}/>
  <canvas ref={canvas} onClick={pick} className={`max-h-80 max-w-full cursor-crosshair rounded-xl border border-border object-contain ${file?"":"hidden"}`} aria-label="Tap an image pixel to sample its color"/>
  {file&&<p className="text-xs text-muted">{file.name}. Tap the image to pick a color, then tap its swatch to copy HEX.</p>}
 </UtilityShell>;
}
