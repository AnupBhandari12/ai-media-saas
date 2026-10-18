import { validateUtilityImage, assertImageDimensions } from "./common.mjs";
import { validateOcrLanguage, cleanOcrText, normalizeOcrProgress } from "./ocrRules.mjs";

// One controller per user action; cancel interrupts worker. No file upload is performed.
export function createImageOcrRun() {
  let cancelled = false, worker = null;
  return {
    async run(file, { language = "eng", onProgress } = {}) {
      validateUtilityImage(file, 10 * 1024 * 1024);
      const config = validateOcrLanguage(language);
      let bitmap = null, canvas = null;
      try {
        onProgress?.({stage:"Loading image",progress:0});
        bitmap = await createImageBitmap(file);
        assertImageDimensions(bitmap.width, bitmap.height);
        if (cancelled) throw new Error("OCR cancelled.");
        const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
        canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const ctx=canvas.getContext("2d",{willReadFrequently:true});
        if (!ctx) throw new Error("Canvas is unavailable in this browser.");
        ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        bitmap.close();bitmap=null;
        if (cancelled) throw new Error("OCR cancelled.");
        onProgress?.({stage:"Loading OCR language (first run can download files)",progress:0});
        const t = await import("tesseract.js");
        if (cancelled) throw new Error("OCR cancelled.");
        worker = await (t.createWorker || t.default?.createWorker)(config.languages, undefined, {
          logger: e=>{if (!cancelled) onProgress?.({stage:e.status||"Recognizing text",progress:normalizeOcrProgress(e.progress)/100});},
        });
        if (cancelled) throw new Error("OCR cancelled.");
        onProgress?.({stage:"Recognizing text",progress:0});
        const value = await worker.recognize(canvas);
        if (cancelled) throw new Error("OCR cancelled.");
        const text = cleanOcrText(value.data?.text);
        if (!text) throw new Error("No readable text detected. Try a clearer image or different language.");
        return {text,confidence:Math.round(Number(value.data?.confidence)||0),languageLabel:config.label,
          characters:text.length,words:(text.match(/\S+/g)||[]).length};
      } catch (error) {
        if (cancelled) throw new Error("OCR cancelled.");
        throw error;
      } finally {
        if (bitmap) bitmap.close();
        if (canvas) {canvas.width=1;canvas.height=1;}
        if (worker) {await worker.terminate().catch(()=>{});worker=null;}
      }
    },
    async cancel() { cancelled=true; const active=worker; if(active) await active.terminate().catch(()=>{}); },
  };
}
