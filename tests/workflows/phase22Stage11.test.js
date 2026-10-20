import {describe,expect,test} from "bun:test";
import {getWorkflowById} from "../../lib/workflows/registry.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runStudentNotesPack} from "../../lib/workflows/runStudentNotesPack.js";
import {STUDENT_NOTES_STEPS,STUDENT_NOTES_LIMITS,normalizeStudentNotesSettings,
  validateStudentNotesFiles,getStudentNotesPlan,studentNotesDownloadName,createStudentSourcesIndex}
  from "../../lib/workflows/studentNotesPackPlan.js";

const photo=(name="notes1.jpg",type="image/jpeg",bytes=512)=>new File([new Uint8Array(bytes)],name,{type});
const pdf=(bytes=2000)=>new Blob([new Uint8Array(bytes)],{type:"application/pdf"});
function mocks({log=[],scanCount,numberCount,scanBlobType="application/pdf",numberBlobType="application/pdf",
    scanBlobSize=1500,numberBlobSize=1700,failScan=false,failNumber=false}={}) {
  return {
    scan:async(files,settings)=>{
      log.push(["PDF-17",files.map(item=>item.name),settings]);
      if(failScan) throw new Error("scan failed");
      return {blob:new Blob([new Uint8Array(scanBlobSize)],{type:scanBlobType}),pageCount:scanCount??files.length};
    },
    number:async(file,settings)=>{
      log.push(["PDF-13",file.name,settings]);
      if(failNumber) throw new Error("number failed");
      return {blob:new Blob([new Uint8Array(numberBlobSize)],{type:numberBlobType}),
        pageCount:numberCount??2,selectedPages:Array.from({length:numberCount??2},(_,i)=>i+1)};
    },
  };
}
describe("Phase 22 Stage 11 WF-10 Student Notes photos-to-PDF beta",()=>{
  test("approved registry uses PDF-17 followed by PDF-13",()=>{
    expect(getWorkflowById("WF-10").variants[0].steps).toEqual(STUDENT_NOTES_STEPS);
    expect(getStudentNotesPlan().steps).toEqual(["PDF-17","PDF-13"]);
  });
  test("default plan is browser-local with no cost/AI flags",()=>{
    const plan=getStudentNotesPlan();
    expect(plan.processingMode).toBe("BROWSER_LOCAL");
    expect(plan.config).toEqual({title:"My study notes",mode:"ENHANCE",pageSize:"A4",startNumber:1});
  });
  test("valid settings and supported enhancement modes",()=>{
    for(const mode of ["ENHANCE","GRAYSCALE","ORIGINAL"])
      expect(getStudentNotesPlan({mode,pageSize:"FIT",startNumber:2}).config.mode).toBe(mode);
  });
  test("reject unsupported, AI and malicious settings",()=>{
    for(const bad of [null,[],{ai:true},{provider:"openai"},{summary:"fast"},
      {steps:["AI-01"]},{title:"a"},{title:"x".repeat(91)},
      {mode:"OCR"},{pageSize:"LEGAL"},{startNumber:-1},{startNumber:1.5},
      {startNumber:10000},{title:"bad\ncontrol"}])
      expect(()=>normalizeStudentNotesSettings(bad)).toThrow();
  });
  test("accept only supported JPG, PNG, WebP",()=>{
    for(const type of ["image/jpeg","image/png","image/webp"])
      expect(validateStudentNotesFiles([photo("file",type)]).totalBytes).toBe(512);
    expect(()=>validateStudentNotesFiles([photo("readme.svg","image/svg+xml")])).toThrow();
  });
  test("reject empty, missing, >15 and malformed files",()=>{
    expect(()=>validateStudentNotesFiles([])).toThrow();
    expect(()=>validateStudentNotesFiles(null)).toThrow();
    expect(()=>validateStudentNotesFiles(Array.from({length:16},()=>photo()))).toThrow();
    expect(()=>validateStudentNotesFiles([new File([],"empty.jpg",{type:"image/jpeg"})])).toThrow();
    expect(()=>validateStudentNotesFiles([{type:"image/jpeg",size:3,name:""}])).toThrow();
  });
  test("enforce individual and total byte limits",()=>{
    expect(()=>validateStudentNotesFiles([{type:"image/jpeg",size:STUDENT_NOTES_LIMITS.maxFileBytes+1,name:"x.jpg"}])).toThrow();
    expect(()=>validateStudentNotesFiles(Array.from({length:6},(_,i)=>({type:"image/jpeg",size:9*1024*1024,name:`x${i}.jpg`})))).toThrow(/50 MB/);
  });
  test("execute ordered scan and numbering with actual step trace",async()=>{
    const log=[];const files=[photo("unit-3.png","image/png"),photo("unit-1.jpg")];
    const result=await runStudentNotesPack(files,{title:"Unit 3 Notes",mode:"GRAYSCALE",pageSize:"FIT",startNumber:5},
      {adapters:mocks({log})});
    expect(log.map(item=>item[0])).toEqual(["PDF-17","PDF-13"]);
    expect(log[0][1]).toEqual(["unit-3.png","unit-1.jpg"]);
    expect(log[0][2]).toEqual({mode:"GRAYSCALE",pageSize:"FIT",margin:24});
    expect(log[1][2].startNumber).toBe(5);
    expect(log[1][2].prefix).toBe("Page ");
    expect(result.filename).toBe("Unit-3-Notes-student-notes.pdf");
    expect(result.pageCount).toBe(2);
    expect(result.trace.map(item=>item.id)).toEqual(["PDF-17","PDF-13"]);
    expect(result.sources.text).toContain("Page 5 (PDF sheet 1): unit-3.png");
    expect(result.sources.text).toContain("Page 6 (PDF sheet 2): unit-1.jpg");
    expect(result.sources.filename).toBe("Unit-3-Notes-student-notes-sources.txt");
  });
  test("does not call adapters on aborted signal",async()=>{
    const controller=new AbortController();controller.abort();const log=[];
    await expect(runStudentNotesPack([photo()],{},{adapters:mocks({log}),signal:controller.signal})).rejects.toThrow(/cancel/i);
    expect(log.length).toBe(0);
  });
  test("does not generate result when cancellation happens after scan",async()=>{
    const controller=new AbortController();const log=[];
    const adapters=mocks({log});const scan=adapters.scan;
    adapters.scan=async(...args)=>{const result=await scan(...args);controller.abort();return result;};
    await expect(runStudentNotesPack([photo(),photo("b.jpg")],{},
      {adapters,signal:controller.signal})).rejects.toThrow(/cancel/i);
    expect(log.map(item=>item[0])).toEqual(["PDF-17"]);
  });
  test("bad PDF MIME rejected before numbering",async()=>{
    const log=[];
    await expect(runStudentNotesPack([photo(),photo("b.jpg")],{},
      {adapters:mocks({log,scanBlobType:"text/plain"})})).rejects.toThrow(/PDF/);
    expect(log).toHaveLength(1);
  });
  test("wrong page count fails closed",async()=>{
    await expect(runStudentNotesPack([photo(),photo("b.jpg")],{},
      {adapters:mocks({scanCount:1})})).rejects.toThrow(/page count/);
    await expect(runStudentNotesPack([photo(),photo("b.jpg")],{},
      {adapters:mocks({numberCount:1})})).rejects.toThrow(/page count/);
  });
  test("missing PDF adapter rejected",async()=>{
    await expect(runStudentNotesPack([photo()],{},{adapters:{scan:async()=>({})}})).rejects.toThrow(/adapters/);
  });
  test("PDF step exceptions do not produce results",async()=>{
    await expect(runStudentNotesPack([photo(),photo("b.jpg")],{},
      {adapters:mocks({failScan:true})})).rejects.toThrow(/scan failed/);
    await expect(runStudentNotesPack([photo(),photo("b.jpg")],{},
      {adapters:mocks({failNumber:true})})).rejects.toThrow(/number failed/);
  });
  test("reject PDF over size cap",async()=>{
    await expect(runStudentNotesPack([photo(),photo("b.jpg")],{},
      {adapters:mocks({scanBlobSize:STUDENT_NOTES_LIMITS.maxPdfBytes+1})})).rejects.toThrow(/30 MB/);
  });
  test("safe download filenames and unsupported extensions",()=>{
    expect(studentNotesDownloadName("My notes #01")).toBe("My-notes-01-student-notes.pdf");
    expect(studentNotesDownloadName("नेपाली notes","sources")).toBe("notes-student-notes-sources.txt");
    expect(()=>studentNotesDownloadName("x","zip")).toThrow();
  });
  test("source index escapes line breaks and does not claim OCR",()=>{
    const source=createStudentSourcesIndex([photo("first\nsecond.png"),photo("two.jpg")],normalizeStudentNotesSettings());
    expect(source).toContain("first second.png");
    expect(source).toContain("not OCR");
    expect(source).toContain("Page 2 (PDF sheet 2)");
  });
  test("previous approved sequences stay available, new unapproved sequence blocked",async()=>{
    for(const steps of [["IMG-08","IMG-03","IMG-12"],["CRT-04","IMG-02"],["IMG-02"]]){
      const input=photo();
      const result=await runApprovedLocalSteps({steps,input,operations:Object.fromEntries(steps.map(id=>[id,async file=>({file,status:"SKIPPED"})]))});
      expect(result.trace).toHaveLength(steps.length);
    }
    await expect(runApprovedLocalSteps({steps:["PDF-18","AI-01"],input:photo(),operations:{}})).rejects.toThrow(/not approved/);
  });
});
