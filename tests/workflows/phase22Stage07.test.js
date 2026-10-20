import {describe, expect, test} from "bun:test";
import {readFileSync} from "node:fs";
import {getWorkflowById} from "../../lib/workflows/registry.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runFacebookReady} from "../../lib/workflows/runFacebookReady.js";
import {FACEBOOK_PRESETS, FACEBOOK_READY_STEPS, normalizeFacebookSettings,
  validateFacebookFile, validateFacebookSource, getFacebookCrop,
  getFacebookReadyPlan, createFacebookFilename} from "../../lib/workflows/facebookReadyPlan.js";
const input = (type = "image/jpeg") => new File([new Uint8Array(1000)], "photo.jpg", {type});
const blob = (type = "image/jpeg", bytes = 400) => new Blob([new Uint8Array(bytes)], {type});
function mockAdapters({calls = [], dimensions = {width: 4000, height: 3000},
  mime = "image/jpeg", finalDimensions = {width: 1080, height: 1080}} = {}) {
  return {
    dimensions: async () => dimensions,
    crop: async (f, crop) => { calls.push("IMG-08"); return {blob: blob(f.type, 800), width: crop.width, height: crop.height}; },
    resize: async (f, width, height) => {calls.push("IMG-03"); return {blob: blob(f.type, 600), width, height};},
    compress: async (_f, quality) => {calls.push("IMG-01"); return {blob: blob(mime, 350),
      width: finalDimensions.width, height: finalDimensions.height, reduced: true, quality};},
  };
}
describe("Phase 22 Stage 07 / Facebook Ready photo-only browser workflow", () => {
  test("matches the approved WF-03 registry image path exactly", () => {
    const workflow = getWorkflowById("WF-03");
    expect(workflow.slug).toBe("facebook-ready");
    expect(workflow.variants.length).toBe(1);
    expect(workflow.variants[0].steps).toEqual(FACEBOOK_READY_STEPS);
    expect(getFacebookReadyPlan().steps).toEqual(["IMG-08", "IMG-03", "IMG-01"]);
  });
  test("has bounded square, landscape and cover drafts", () => {
    expect(FACEBOOK_PRESETS.square).toMatchObject({width: 1080, height: 1080});
    expect(FACEBOOK_PRESETS.landscape).toMatchObject({width: 1200, height: 630});
    expect(FACEBOOK_PRESETS.cover).toMatchObject({width: 1640, height: 624});
  });
  test("rejects unknown variants, providers, injected steps, quality and focus", () => {
    for (const bad of [{presetId:"reel"}, {provider:"ai"}, {steps:["IMG-01"]},
      {qualityPercent:40}, {horizontalPosition:101}, {verticalPosition:-1}, {qualityPercent:"80"}]) {
      expect(() => normalizeFacebookSettings(bad)).toThrow();
    }
  });
  test("rejects unsupported empty and oversized inputs", () => {
    expect(() => validateFacebookFile()).toThrow();
    expect(() => validateFacebookFile(new File([],"zero.png",{type:"image/png"}))).toThrow();
    expect(() => validateFacebookFile(input("image/svg+xml"))).toThrow();
    expect(() => validateFacebookFile({name:"big.jpg",size:11*1024*1024,type:"image/jpeg"})).toThrow();
  });
  test("rejects invalid and enormous decoded dimensions", () => {
    expect(validateFacebookSource(4000,3000)).toEqual({width:4000,height:3000});
    expect(() => validateFacebookSource(9000,100)).toThrow();
    expect(() => validateFacebookSource(6000,5000)).toThrow();
    expect(() => validateFacebookSource(0,1000)).toThrow();
  });
  test("square and cover crops remain in bounds and support focus", () => {
    expect(getFacebookCrop({width:4000,height:3000},{presetId:"square"}))
      .toEqual({x:500,y:0,width:3000,height:3000});
    const cover = getFacebookCrop({width:4000,height:3000}, {presetId:"cover", verticalPosition:100});
    expect(cover.width).toBe(4000);
    expect(cover.x+cover.width).toBeLessThanOrEqual(4000);
    expect(cover.y+cover.height).toBeLessThanOrEqual(3000);
    expect(getFacebookCrop({width:4000,height:3000},{presetId:"square",horizontalPosition:100}).x).toBe(1000);
  });
  test("too small photos are rejected instead of silently upscaled", () => {
    expect(() => getFacebookCrop({width:700,height:700},{presetId:"square"})).toThrow(/too small/);
    expect(() => getFacebookCrop({width:1000,height:800},{presetId:"cover"})).toThrow(/too small/);
  });
  test("executes exact crop then resize then compress and provides trace", async () => {
    const calls=[];
    const result=await runFacebookReady(input(),{presetId:"square"},{adapters:mockAdapters({calls})});
    expect(calls).toEqual(["IMG-08","IMG-03","IMG-01"]);
    expect(result.trace.map(t=>t.id)).toEqual(FACEBOOK_READY_STEPS);
    expect(result.filename).toBe("photo-facebook-square.jpg");
    expect(result.result).toMatchObject({width:1080,height:1080,mimeType:"image/jpeg",publishComplianceVerified:false});
  });
  test("uses actual output MIME for filenames and refuses changed type", async () => {
    const result=await runFacebookReady(input("image/png"),{},
      {adapters:mockAdapters({mime:"image/png"})});
    expect(result.filename).toBe("photo-facebook-square.png");
    await expect(runFacebookReady(input(),{}, {adapters:mockAdapters({mime:"image/webp"})})).rejects.toThrow(/format/);
  });
  test("wrong dimensions or oversized output fail closed", async () => {
    await expect(runFacebookReady(input(),{}, {adapters:mockAdapters({finalDimensions:{width:800,height:1080}})})).rejects.toThrow(/dimensions/);
    const bad=mockAdapters(); bad.crop=async()=>({blob:blob(),width:1,height:1});
    await expect(runFacebookReady(input(),{}, {adapters:bad})).rejects.toThrow(/dimensions/);
  });
  test("cancellation precedes decoder and processing", async () => {
    const ctrl=new AbortController();ctrl.abort();let called=false;
    const adapters=mockAdapters();adapters.dimensions=async()=>{called=true;};
    await expect(runFacebookReady(input(),{}, {signal:ctrl.signal,adapters})).rejects.toThrow();
    expect(called).toBe(false);
  });
  test("approved executor preserves Website WhatsApp Email Job and Instagram sequences", async () => {
    for (const steps of [["IMG-03","IMG-05","IMG-14","IMG-02"],
      ["IMG-05","IMG-02"], ["IMG-02"], ["IMG-10","IMG-02"], ["IMG-08","IMG-03","IMG-01"]]) {
      const result=await runApprovedLocalSteps({steps,input:input(), operations:Object.fromEntries(
        steps.map(id=>[id,async f=>({file:f,status:"SKIPPED"})]))});
      expect(result.trace.length).toBe(steps.length);
    }
    await expect(runApprovedLocalSteps({steps:["IMG-03","IMG-01"], input:input(), operations:{}}))
      .rejects.toThrow(/approved/);
  });
  test("filename is bounded and cannot be HTML or SVG", () => {
    expect(createFacebookFilename("../weird !!.webp","cover","image/webp"))
      .toBe("weird-facebook-cover.webp");
    expect(() => createFacebookFilename("x.svg","square","image/svg+xml")).toThrow();
  });
  test("source contains no API requests, paid providers or publishing", () => {
    const source=readFileSync(new URL("../../lib/workflows/runFacebookReady.js",import.meta.url),"utf8");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("/api/");
    expect(source).not.toContain("VID-");
  });
});
