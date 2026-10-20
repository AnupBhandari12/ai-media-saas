import {describe, expect, test} from "bun:test";
import {readFileSync} from "node:fs";
import {getWorkflowById} from "../../lib/workflows/registry.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runLinkedInReady} from "../../lib/workflows/runLinkedInReady.js";
import {LINKEDIN_PRESETS, LINKEDIN_READY_STEPS, LINKEDIN_LIMITS,
  normalizeLinkedInSettings, validateLinkedInFile, validateLinkedInSource,
  calculateLinkedInSize, getLinkedInReadyPlan, createLinkedInFilename} from "../../lib/workflows/linkedInReadyPlan.js";

const file = (type = "image/jpeg", name = "photo.jpg") => new File([new Uint8Array(1000)], name, {type});
const blob = (type = "image/jpeg", bytes = 450) => new Blob([new Uint8Array(bytes)], {type});
function mockAdapters({calls = [], dimensions = {width: 4000, height: 3000},
  resizedType = "image/png", conversionType = "image/jpeg", finalType = "image/jpeg", badDims = false} = {}) {
  const scale = Math.min(1, 1200 / dimensions.width, 627 / dimensions.height);
  const size = {width: Math.max(1,Math.floor(dimensions.width * scale)),
    height: Math.max(1,Math.floor(dimensions.height * scale))};
  return {
    dimensions: async () => dimensions,
    resize: async (_f, w, h) => {calls.push("IMG-03");return {blob:blob(resizedType,700),width:w,height:h};},
    convert: async (_f, type, q) => {calls.push("IMG-05");return {blob:blob(conversionType,600),width:size.width,height:size.height, requestedType:type,quality:q};},
    compress: async (_f, q) => {calls.push("IMG-01");return {blob:blob(finalType,400),width:badDims?42:size.width,height:size.height,quality:q,reduced:true};},
  };
}

describe("Phase 22 Stage 08 — LinkedIn Ready post-photo local beta", () => {
  test("uses exactly WF-04 approved post steps, not profile", () => {
    const workflow=getWorkflowById("WF-04");
    expect(workflow.variants.find(v=>v.id==="post").steps).toEqual(LINKEDIN_READY_STEPS);
    expect(getLinkedInReadyPlan().steps).toEqual(["IMG-03","IMG-05","IMG-01"]);
    expect(getLinkedInReadyPlan().variantId).toBe("post");
  });
  test("presets are maximum bounds and valid", () => {
    expect(LINKEDIN_PRESETS.landscape).toMatchObject({maxWidth:1200,maxHeight:627});
    expect(LINKEDIN_PRESETS.square).toMatchObject({maxWidth:1080,maxHeight:1080});
    expect(LINKEDIN_PRESETS.portrait).toMatchObject({maxWidth:1080,maxHeight:1350});
  });
  test("rejects unknown settings, providers, overrides and invalid quality", () => {
    for (const config of [null, [], {presetId:"video"},{qualityPercent:101},{qualityPercent:"80"},
      {steps:["IMG-01"]},{variantId:"profile"},{provider:"paid"},{maxWidth:9000}]) {
      expect(() => normalizeLinkedInSettings(config)).toThrow();
    }
  });
  test("rejects missing, unsupported, oversized or empty inputs", () => {
    expect(() => validateLinkedInFile()).toThrow();
    expect(() => validateLinkedInFile(new File([],"empty.png",{type:"image/png"}))).toThrow();
    expect(() => validateLinkedInFile(file("image/svg+xml"))).toThrow();
    expect(() => validateLinkedInFile({name:"too-large.png",type:"image/png",size:LINKEDIN_LIMITS.maxInputBytes+1})).toThrow();
  });
  test("bounds decoded source dimensions and total pixels", () => {
    expect(validateLinkedInSource(4000,3000)).toEqual({width:4000,height:3000});
    for (const [w,h] of [[0,200],[9000,200],[5000,5000],[-3,2],[2.5,50]]) {
      expect(() => validateLinkedInSource(w,h)).toThrow();
    }
  });
  test("resizes inside box without crop, stretch or upscaling", () => {
    expect(calculateLinkedInSize({width:4000,height:3000},{presetId:"landscape"}))
      .toEqual({width:836,height:627,scaledDown:true});
    expect(calculateLinkedInSize({width:500,height:300},{presetId:"landscape"}))
      .toEqual({width:500,height:300,scaledDown:false});
    expect(calculateLinkedInSize({width:4000,height:3000},{presetId:"square"}))
      .toEqual({width:1080,height:810,scaledDown:true});
    expect(calculateLinkedInSize({width:3000,height:4000},{presetId:"portrait"}))
      .toEqual({width:1012,height:1350,scaledDown:true});
  });
  test("runs IMG-03, IMG-05, IMG-01 and produces verified JPG output", async () => {
    const calls=[];
    const result=await runLinkedInReady(file("image/png","my-image.png"),{},
      {adapters:mockAdapters({calls})});
    expect(calls).toEqual(["IMG-03","IMG-05","IMG-01"]);
    expect(result.trace.map(s=>s.id)).toEqual(LINKEDIN_READY_STEPS);
    expect(result.result).toMatchObject({width:836,height:627,mimeType:"image/jpeg",noCrop:true,noUpscaling:true});
    expect(result.filename).toBe("my-image-linkedin-landscape.jpg");
  });
  test("already-small JPEG skips resize and conversion, still compresses", async () => {
    const calls=[];
    const result=await runLinkedInReady(file(),{},
      {adapters:mockAdapters({calls, dimensions:{width:400,height:300}})});
    expect(calls).toEqual(["IMG-01"]);
    expect(result.trace.map(s=>s.status)).toEqual(["SKIPPED","SKIPPED","COMPLETED"]);
  });
  test("rejects conversion returning WebP despite requested JPEG", async () => {
    await expect(runLinkedInReady(file("image/png"),{},
      {adapters:mockAdapters({conversionType:"image/webp"})})).rejects.toThrow(/format/);
  });
  test("rejects a resizing step with unexpected MIME", async () => {
    await expect(runLinkedInReady(file("image/png"),{},
      {adapters:mockAdapters({resizedType:"image/jpeg"})})).rejects.toThrow(/format/);
  });
  test("rejects compression with wrong dimensions or type", async () => {
    await expect(runLinkedInReady(file("image/png"),{},
      {adapters:mockAdapters({badDims:true})})).rejects.toThrow(/dimensions/);
    await expect(runLinkedInReady(file("image/png"),{},
      {adapters:mockAdapters({finalType:"image/webp"})})).rejects.toThrow(/format/);
  });
  test("cancellation before decode stops all operations", async () => {
    const ctrl = new AbortController(); ctrl.abort(); let decoded=false;
    const api=mockAdapters();api.dimensions=async()=>{decoded=true;};
    await expect(runLinkedInReady(file(),{}, {adapters:api,signal:ctrl.signal})).rejects.toThrow();
    expect(decoded).toBe(false);
  });
  test("shared executor rejects profile and invented step sequences", async () => {
    const a=async()=>({file:file(),status:"COMPLETED"});
    const operations={"IMG-03":a,"IMG-05":a,"IMG-01":a,"IMG-11":a};
    await expect(runApprovedLocalSteps({steps:["IMG-11","IMG-01"],input:file(),operations})).rejects.toThrow();
    await expect(runApprovedLocalSteps({steps:["IMG-01","IMG-05","IMG-03"],input:file(),operations})).rejects.toThrow();
  });
  test("keeps earlier Website, WhatsApp, Email, Job and Social sequences", async () => {
    const approved=[
      ["IMG-03","IMG-05","IMG-14","IMG-02"], ["IMG-05","IMG-02"],
      ["IMG-02"],["IMG-10","IMG-02"],["IMG-08","IMG-03","IMG-01"],
    ];
    for(const steps of approved) {
      const operations=Object.fromEntries(steps.map((id)=>[id,async(input)=>({file:input,status:"COMPLETED"})]));
      const result=await runApprovedLocalSteps({steps,input:file(),operations});
      expect(result.trace.map(s=>s.id)).toEqual(steps);
    }
  });
  test("filenames are sanitized and identify the actual JPG output", () => {
    expect(createLinkedInFilename("hi!.png","square")).toBe("hi-linkedin-square.jpg");
    expect(()=>createLinkedInFilename("bad","profile")).toThrow();
  });
  test("no external services or profile implementation enabled", () => {
    const code=readFileSync(new URL("../../lib/workflows/runLinkedInReady.js", import.meta.url),"utf8");
    expect(code).not.toContain("fetch(");
    expect(code).not.toContain("/api/");
    expect(code).not.toContain("IMG-11");
  });
});
