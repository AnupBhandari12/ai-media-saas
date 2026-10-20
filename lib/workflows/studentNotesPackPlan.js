// WF-10 / Stage 11: bounded photos-to-numbered-PDF beta. No AI, OCR or remote execution.
import {getWorkflowById} from "./registry.js";

export const STUDENT_NOTES_STEPS=Object.freeze(["PDF-17","PDF-13"]);
export const STUDENT_NOTES_LIMITS=Object.freeze({
  maxFiles:15,maxFileBytes:10*1024*1024,maxTotalBytes:50*1024*1024,
  maxPdfBytes:30*1024*1024,maxTitleChars:90,
});
export const SCAN_MODES=Object.freeze(["ENHANCE","GRAYSCALE","ORIGINAL"]);
export const PAGE_SIZES=Object.freeze(["A4","FIT"]);
const ACCEPTED_TYPES=Object.freeze(["image/jpeg","image/png","image/webp"]);
const SETTING_KEYS=["title","mode","pageSize","startNumber"];

export function normalizeStudentNotesSettings(raw={}) {
  if(!raw||Array.isArray(raw)||typeof raw!=="object"||
     Object.keys(raw).some(key=>!SETTING_KEYS.includes(key))) {
    throw new Error("Unsupported Student Notes settings.");
  }
  const title=raw.title??"My study notes";
  const mode=raw.mode??"ENHANCE";
  const pageSize=raw.pageSize??"A4";
  const startNumber=raw.startNumber??1;
  if(typeof title!=="string"||title.trim().length<2||title.trim().length>90||
    /[\x00-\x1f\x7f]/.test(title)) throw new Error("Note title must be 2–90 characters.");
  if(!SCAN_MODES.includes(mode)) throw new Error("Invalid document scan mode.");
  if(!PAGE_SIZES.includes(pageSize)) throw new Error("Invalid PDF page size.");
  if(!Number.isSafeInteger(startNumber)||startNumber<1||startNumber>9999) {
    throw new Error("Starting page number must be between 1 and 9999.");
  }
  return Object.freeze({title:title.trim(),mode,pageSize,startNumber});
}

export function validateStudentNotesFiles(files) {
  if(!Array.isArray(files)||files.length<1||files.length>STUDENT_NOTES_LIMITS.maxFiles) {
    throw new Error("Choose 1–15 study note photos.");
  }
  let total=0;
  for(const file of files) {
    if(!file||typeof file.name!=="string"||!file.name.trim()||
      !ACCEPTED_TYPES.includes(file.type)||!Number.isSafeInteger(file.size)||
      file.size<1||file.size>STUDENT_NOTES_LIMITS.maxFileBytes) {
      throw new Error("Each photo must be a non-empty JPG, PNG or WebP up to 10 MB.");
    }
    total+=file.size;
  }
  if(total>STUDENT_NOTES_LIMITS.maxTotalBytes) {
    throw new Error("Combined note photos must be 50 MB or smaller.");
  }
  return Object.freeze({files:Object.freeze([...files]),totalBytes:total});
}

export function getStudentNotesPlan(rawSettings={}) {
  const config=normalizeStudentNotesSettings(rawSettings);
  const variant=getWorkflowById("WF-10")?.variants.find(item=>item.id==="photos");
  if(!variant||variant.steps.length!==STUDENT_NOTES_STEPS.length||
      variant.steps.some((id,index)=>id!==STUDENT_NOTES_STEPS[index])) {
    throw new Error("Student Notes photos flow differs from approved registry.");
  }
  return Object.freeze({workflowId:"WF-10",variantId:"photos",processingMode:"BROWSER_LOCAL",
    steps:STUDENT_NOTES_STEPS,config});
}
export function studentNotesDownloadName(title,kind="pdf") {
  if(!["pdf","sources"].includes(kind)) throw new Error("Unsupported Student Notes download.");
  const stem=String(title).normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g,"-")
    .replace(/-+/g,"-").replace(/^-|-+$/g,"").slice(0,60)||"study-notes";
  return `${stem}-student-notes${kind==="pdf"?".pdf":"-sources.txt"}`;
}
function singleLine(name) {
  return String(name).replace(/[\x00-\x1f\x7f]/g," ").slice(0,160);
}
export function createStudentSourcesIndex(files,config) {
  const checked=validateStudentNotesFiles(files);
  const settings=normalizeStudentNotesSettings(config);
  return ["AI Media | Student Notes Pack — Source Page Index",
    `Title: ${settings.title}`,`Page count: ${checked.files.length}`,
    `Scan mode: ${settings.mode}`,`Page layout: ${settings.pageSize}`,
    "", "Source image -> numbered PDF page", ...checked.files.map((file,index)=>
      `Page ${settings.startNumber+index} (PDF sheet ${index+1}): ${singleLine(file.name)}`),
    "","This document contains photographed pages, not extracted or summarized text.",
    "This is not OCR or AI-generated notes. Verify each page for readability.",""].join("\n");
}
