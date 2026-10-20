import {describe,expect,test} from "bun:test";
import {readFileSync} from "node:fs";
import {getWorkflowById} from "../../lib/workflows/registry.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runYouTubeReady} from "../../lib/workflows/runYouTubeReady.js";
import {YOUTUBE_READY_STEPS,YOUTUBE_READY_TARGETS,YOUTUBE_READY_LIMITS,
  normalizeYouTubeReadySettings,validateYouTubeReadyFile,validateYouTubeReadyDimensions,
  getYouTubeReadyPlan,createYouTubeReadyFilename} from "../../lib/workflows/youtubeReadyPlan.js";

const file=(type="image/png",name="cover.png")=>new File([new Uint8Array(1100)],name,{type});
const blob=(size=2000,type="image/jpeg")=>new Blob([new Uint8Array(size)],{type});
function mockAdapters({calls=[],source={width:3000,height:2000},renderBlob=blob(1800000),
  renderSize={width:1280,height:720},compressBlob=blob(420000),
  compressedSize={width:1280,height:720},decodedOutput={width:1280,height:720}}={}) {
  return {
    dimensions:async (f)=>{
      calls.push("dimensions");
      return f.name==="cover.png"||f.name==="image.jpg"?source:decodedOutput;
    },
    thumbnail:async (_f,options)=>{
      calls.push("CRT-04");
      expect(options.settings.useBrandKit).toBe(false);
      expect(options.settings.showLogo).toBe(false);
      expect(options.brandKit).toBe(null);
      expect(options.settings.outputFormat).toBe("jpg");
      return {blob:renderBlob,...renderSize};
    },
    compress:async (_f,targetKb)=>{calls.push("IMG-02");expect(YOUTUBE_READY_TARGETS.includes(targetKb)).toBe(true);
      return {blob:compressBlob,...compressedSize};},
  };
}

describe("Phase 22 Stage 09 / WF-05 YouTube thumbnail browser-local beta",()=>{
  test("exact approved thumbnail steps, video preview never executes",()=>{
    const wf=getWorkflowById("WF-05");
    expect(wf.variants.find(v=>v.id==="thumbnail").steps).toEqual(YOUTUBE_READY_STEPS);
    expect(getYouTubeReadyPlan().variantId).toBe("thumbnail");
    expect(getYouTubeReadyPlan().steps).toEqual(["CRT-04","IMG-02"]);
  });
  test("valid templates and target KB goals",()=>{
    expect(normalizeYouTubeReadySettings({template:"CENTERED",title:"A real title",targetKb:512}).targetKb).toBe(512);
    expect(normalizeYouTubeReadySettings({template:"CLEAN_BOTTOM"}).template).toBe("CLEAN_BOTTOM");
    expect(YOUTUBE_READY_TARGETS).toEqual([512,1024,2048]);
  });
  test("rejects unapproved settings, vendor and forged workflow lists",()=>{
    for(const s of [null,[],{template:"VIDEO"},{variantId:"video"},{provider:"paid"},
      {steps:["IMG-02"]},{targetKb:100},{targetKb:"1024"},{focusX:-1},{focusY:101},
      {title:" "},{title:"xy"},{title:"x".repeat(101)},{subtitle:"s".repeat(141)}]) {
      expect(()=>normalizeYouTubeReadySettings(s)).toThrow();
    }
  });
  test("accepts JPEG PNG WebP and rejects empty oversize or spoofed types",()=>{
    for(const mime of ["image/jpeg","image/png","image/webp"]) expect(validateYouTubeReadyFile(file(mime))).toBeTruthy();
    expect(()=>validateYouTubeReadyFile()).toThrow();
    expect(()=>validateYouTubeReadyFile(new File([],"empty.png",{type:"image/png"}))).toThrow();
    expect(()=>validateYouTubeReadyFile(file("image/svg+xml"))).toThrow();
    expect(()=>validateYouTubeReadyFile({name:"big.png",type:"image/png",size:YOUTUBE_READY_LIMITS.maxInputBytes+1})).toThrow();
  });
  test("decoded source dimensions are bounded",()=>{
    expect(validateYouTubeReadyDimensions(4000,3000)).toEqual({width:4000,height:3000});
    for(const [w,h] of [[0,100],[9000,10],[5000,5000],[10.5,20],[-1,5]]) {
      expect(()=>validateYouTubeReadyDimensions(w,h)).toThrow();
    }
  });
  test("executes two steps locally, verifies exact 1280×720 JPG and filename",async()=>{
    const calls=[];
    const result=await runYouTubeReady(file(),{title:"My video title",targetKb:512},
      {adapters:mockAdapters({calls})});
    expect(result.trace.map(x=>x.id)).toEqual(YOUTUBE_READY_STEPS);
    expect(calls.filter(x=>["CRT-04","IMG-02"].includes(x))).toEqual(YOUTUBE_READY_STEPS);
    expect(result.result).toMatchObject({width:1280,height:720,mimeType:"image/jpeg",reachedTarget:true,videoEnabled:false});
    expect(result.filename).toBe("cover-youtube-ready.jpg");
  });
  test("skips compression when thumbnail already within selected goal",async()=>{
    const calls=[];
    const result=await runYouTubeReady(file(),{}, {adapters:mockAdapters({calls,renderBlob:blob(240000)})});
    expect(calls.includes("IMG-02")).toBe(false);
    expect(result.trace.map(x=>x.status)).toEqual(["COMPLETED","SKIPPED"]);
  });
  test("rejects render output that is PNG rather than JPG",async()=>{
    await expect(runYouTubeReady(file(),{}, {adapters:mockAdapters({renderBlob:blob(1000,"image/png")})})).rejects.toThrow(/JPG/);
  });
  test("rejects renderer that returns wrong pixel geometry",async()=>{
    await expect(runYouTubeReady(file(),{}, {adapters:mockAdapters({renderSize:{width:800,height:800}})})).rejects.toThrow(/dimensions/);
  });
  test("rejects a compressor that downscales to hit size goal",async()=>{
    await expect(runYouTubeReady(file(),{targetKb:512},
      {adapters:mockAdapters({compressedSize:{width:1000,height:562}})})).rejects.toThrow(/dimensions/);
  });
  test("rejects output when actual decoded geometry differs despite claimed dimensions",async()=>{
    await expect(runYouTubeReady(file(),{targetKb:512},
      {adapters:mockAdapters({decodedOutput:{width:640,height:360}})})).rejects.toThrow(/dimensions/);
  });
  test("rejects compression to WebP despite JPG requested",async()=>{
    await expect(runYouTubeReady(file(),{targetKb:512},
      {adapters:mockAdapters({compressBlob:blob(1000,"image/webp")})})).rejects.toThrow(/JPG/);
  });
  test("reports unmet byte goal without false guarantee, dimensions unchanged",async()=>{
    const r=await runYouTubeReady(file(),{targetKb:512},
      {adapters:mockAdapters({compressBlob:blob(750000)})});
    expect(r.result.reachedTarget).toBe(false);
    expect(r.result.width).toBe(1280);
  });
  test("abort before dispatch prevents reading image",async()=>{
    const ctrl=new AbortController();ctrl.abort();let count=0;
    const a=mockAdapters();a.dimensions=async()=>{count++;return {width:2000,height:1000};};
    await expect(runYouTubeReady(file(),{}, {signal:ctrl.signal,adapters:a})).rejects.toThrow();
    expect(count).toBe(0);
  });
  test("rejects invented workflow paths, preserves Stage02–08 sequences",async()=>{
    const operations=Object.fromEntries(["CRT-04","IMG-02","VID-03","IMG-10","IMG-05","IMG-01","IMG-08","IMG-03","IMG-14"].map(id=>
      [id,async(input)=>({file:input,status:"COMPLETED"})]));
    await expect(runApprovedLocalSteps({steps:["VID-03","IMG-01"],input:file(),operations})).rejects.toThrow();
    await expect(runApprovedLocalSteps({steps:["IMG-02","CRT-04"],input:file(),operations})).rejects.toThrow();
    const approved=[["IMG-03","IMG-05","IMG-14","IMG-02"],["IMG-05","IMG-02"],
      ["IMG-02"],["IMG-10","IMG-02"],["IMG-08","IMG-03","IMG-01"],["IMG-03","IMG-05","IMG-01"]];
    for(const steps of approved){const r=await runApprovedLocalSteps({steps,input:file(),operations});
      expect(r.trace.map(x=>x.id)).toEqual(steps);}
  });
  test("sanitized output filenames and no external API, URL or video dispatch",()=>{
    expect(createYouTubeReadyFilename("my! video.png")).toBe("my-video-youtube-ready.jpg");
    expect(createYouTubeReadyFilename("..\u2620")).toMatch(/youtube-ready\.jpg$/);
    const code=readFileSync(new URL("../../lib/workflows/runYouTubeReady.js",import.meta.url),"utf8");
    expect(code).not.toContain("fetch(");
    expect(code).not.toContain("/api/");
    expect(code).not.toContain("VID-03");
  });
});
