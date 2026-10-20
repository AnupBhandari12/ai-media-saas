// WF-10 browser execution: reuse registered PDF-17 and PDF-13 processors.
import {runApprovedLocalSteps} from "./runLocalWorkflow.js";
import {STUDENT_NOTES_LIMITS,STUDENT_NOTES_STEPS,validateStudentNotesFiles,
  getStudentNotesPlan,studentNotesDownloadName,createStudentSourcesIndex}
  from "./studentNotesPackPlan.js";

function ensureResultBlob(result,stage) {
  const blob=result?.blob;
  if(!(blob instanceof Blob)||blob.type!=="application/pdf"||blob.size<1||
      blob.size>STUDENT_NOTES_LIMITS.maxPdfBytes) {
    throw new Error(`${stage} could not produce a supported PDF up to 30 MB. Reduce photo size and try again.`);
  }
  return blob;
}
async function defaultAdapters() {
  const [{createScannedPdfFromImages},{addPdfPageNumbers}]=await Promise.all([
    import("@/lib/tools/pdf/createScannedPdfFromImages"),
    import("@/lib/tools/pdf/enhancePdf"),
  ]);
  return {scan:createScannedPdfFromImages,number:addPdfPageNumbers};
}

export async function runStudentNotesPack(files,settings={},options={}) {
  const {files:ordered}=validateStudentNotesFiles(files);
  const plan=getStudentNotesPlan(settings);
  const {signal,onStep}=options;
  if(signal?.aborted) throw new DOMException("Workflow cancelled.","AbortError");
  const adapters=options.adapters??await defaultAdapters();
  if(typeof adapters?.scan!=="function"||typeof adapters?.number!=="function") {
    throw new Error("Student Notes PDF processing adapters unavailable.");
  }
  const trace=[];
  const output=await runApprovedLocalSteps({
    steps:STUDENT_NOTES_STEPS,
    input:ordered,
    signal,
    onStep:event=>{
      if(["COMPLETED","SKIPPED"].includes(event.status)) trace.push(event);
      onStep?.(event);
    },
    operations:{
      "PDF-17":async current=>{
        const scan=await adapters.scan(current,{mode:plan.config.mode,pageSize:plan.config.pageSize,margin:24});
        const blob=ensureResultBlob(scan,"Scan Photos to PDF");
        if(scan.pageCount!==ordered.length) throw new Error("Scanned PDF page count did not match the selected photos.");
        return {file:new File([blob],"student-notes-scanned.pdf",{type:"application/pdf"}),status:"COMPLETED"};
      },
      "PDF-13":async file=>{
        const numbered=await adapters.number(file,{
          pageSelection:"all",startNumber:plan.config.startNumber,
          prefix:"Page ",position:"BOTTOM_CENTER",fontSize:12,margin:24,colorHex:"#111827",
        });
        const blob=ensureResultBlob(numbered,"Add Page Numbers");
        if(numbered.pageCount!==ordered.length||
            (Array.isArray(numbered.selectedPages)&&numbered.selectedPages.length!==ordered.length)) {
          throw new Error("Numbered PDF page count did not match the selected photos.");
        }
        return {file:new File([blob],studentNotesDownloadName(plan.config.title),{type:"application/pdf"}),status:"COMPLETED"};
      },
    },
  });
  if(signal?.aborted) throw new DOMException("Workflow cancelled.","AbortError");
  const sourcesText=createStudentSourcesIndex(ordered,plan.config);
  return Object.freeze({
    filename:output.file.name,blob:output.file,pageCount:ordered.length,
    outputBytes:output.file.size,trace:Object.freeze([...trace]),
    sources:Object.freeze({filename:studentNotesDownloadName(plan.config.title,"sources"),
      blob:new Blob([sourcesText],{type:"text/plain;charset=utf-8"}),text:sourcesText}),
    plan,
  });
}
