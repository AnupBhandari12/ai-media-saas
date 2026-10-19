'use client';
import {useEffect,useRef,useState} from 'react';
import {LOCAL_MAX_PIXELS,removeConnectedSolidColor} from '@/lib/ai/localSolidBackground.mjs';
const checker={backgroundColor:'#fff',backgroundImage:'linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)',backgroundSize:'24px 24px',backgroundPosition:'0 0,0 12px,12px -12px,-12px 0'};
export default function LocalSolidBackgroundLab({file}) {
  const originalRef=useRef(null),resultRef=useRef(null),pixelsRef=useRef(null),downloadRef=useRef(null),mountedRef=useRef(true);
  const [ready,setReady]=useState(false),[sample,setSample]=useState({x:0,y:0}),[tolerance,setTolerance]=useState(35);
  const [status,setStatus]=useState(file?'Decoding locally...':'Choose an image above to start.'),[outputUrl,setOutputUrl]=useState('');
  useEffect(()=>{
    let cancelled=false;
    if(!file)return ()=>{cancelled=true;};
    async function load(){
      let bitmap;
      try {
        bitmap=await createImageBitmap(file);
        if(cancelled)return;
        if(!bitmap.width||!bitmap.height)throw new Error('Invalid image dimensions.');
        const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height),Math.sqrt(LOCAL_MAX_PIXELS/(bitmap.width*bitmap.height)));
        const width=Math.max(1,Math.floor(bitmap.width*ratio)),height=Math.max(1,Math.floor(bitmap.height*ratio));
        const canvas=originalRef.current;
        if(!canvas) return;
        canvas.width=width;canvas.height=height;
        const context=canvas.getContext('2d',{willReadFrequently:true});
        if(!context)throw new Error('Canvas is not available.');
        context.clearRect(0,0,width,height);context.drawImage(bitmap,0,0,width,height);
        pixelsRef.current=context.getImageData(0,0,width,height);
        setReady(true);setStatus(`Ready: ${width} x ${height} local preview. Click the color to clear.`);
      } catch { if(!cancelled)setStatus('Unable to load this image in the browser.'); }
      finally {bitmap?.close?.();}
    }
    void load();
    return ()=>{cancelled=true;};
  },[file]);
  useEffect(()=>{
    mountedRef.current=true;
    return ()=>{mountedRef.current=false;if(downloadRef.current)URL.revokeObjectURL(downloadRef.current);};
  },[]);
  function sampleAt(event){
    const canvas=originalRef.current,rect=canvas?.getBoundingClientRect();if(!canvas||!rect||!ready)return;
    const x=Math.min(canvas.width-1,Math.max(0,Math.floor((event.clientX-rect.left)*canvas.width/rect.width)));
    const y=Math.min(canvas.height-1,Math.max(0,Math.floor((event.clientY-rect.top)*canvas.height/rect.height)));
    setSample({x,y});setStatus(`Selected pixel (${x}, ${y}). Click Remove solid color.`);
  }
  function process(){
    const source=pixelsRef.current,canvas=resultRef.current;if(!source||!canvas)return;
    setStatus('Removing connected background pixels locally...');
    try {
      const out=removeConnectedSolidColor({rgba:source.data,width:source.width,height:source.height,x:sample.x,y:sample.y,tolerance});
      canvas.width=source.width;canvas.height=source.height;
      const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable.');
      context.putImageData(new ImageData(out.rgba,out.width,out.height),0,0);
      canvas.toBlob(blob=>{
        if(!mountedRef.current)return;
        if(!blob){setStatus('PNG export failed.');return;}
        if(downloadRef.current)URL.revokeObjectURL(downloadRef.current);
        const url=URL.createObjectURL(blob);downloadRef.current=url;setOutputUrl(url);
        setStatus(`${out.removedPixels.toLocaleString()} pixels cleared locally. Inspect edges before download.`);
      },'image/png');
    } catch(error){setStatus(error instanceof Error?error.message:'Local processing failed.');}
  }
  return <section className="mt-7 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7" aria-label="Free local background editor">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">Try it now: Remove a solid-color background</h2><span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">BROWSER ONLY - NOT AI</span></div>
    <p className="mt-2 text-sm text-slate-600">Best for simple white or solid backgrounds. Select an image above, click its background on the canvas, adjust tolerance and download a transparent PNG. Complex photos need a real segmentation model later. No upload or paid request.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div><p className="mb-2 text-xs font-semibold uppercase text-slate-600">Before - click background color</p><canvas ref={originalRef} onClick={sampleAt} role="img" aria-label="Original image; click background to sample" className="w-full cursor-crosshair rounded-xl border border-slate-300" style={checker}/></div>
      <div><p className="mb-2 text-xs font-semibold uppercase text-slate-600">After - transparent PNG</p><canvas ref={resultRef} role="img" aria-label="Locally processed transparent PNG" className="w-full rounded-xl border border-slate-300" style={checker}/></div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-4">
      <label htmlFor="local-bg-tolerance" className="text-sm font-semibold text-slate-800">Color tolerance: {tolerance}</label>
      <input id="local-bg-tolerance" type="range" min={0} max={120} step={5} value={tolerance} onChange={e=>setTolerance(Number(e.target.value))} />
      <button type="button" disabled={!ready} onClick={process} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Remove solid color locally</button>
      {outputUrl && <a href={outputUrl} download="local-transparent-background.png" className="rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700">Download PNG</a>}
    </div>
    <p role="status" aria-live="polite" className="mt-3 text-xs text-slate-600">{status}</p>
    <p className="mt-2 text-xs text-amber-800">Output is downscaled to 1.5 million pixels for local safety. Pixel selection and edges are approximate. Paid AI Remove button below remains disabled.</p>
  </section>;
}
