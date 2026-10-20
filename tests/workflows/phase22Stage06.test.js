import {describe, expect, test} from "bun:test";
import {readFileSync} from "node:fs";
import {getWorkflowById} from "../../lib/workflows/registry.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runInstagramReady} from "../../lib/workflows/runInstagramReady.js";
import {createInstagramFilename, getInstagramCrop, getInstagramReadyPlan,
  INSTAGRAM_PRESETS, INSTAGRAM_READY_STEPS, normalizeInstagramSettings,
  validateInstagramFile, validateInstagramSource} from "../../lib/workflows/instagramReadyPlan.js";

const photo = (type = "image/jpeg", name = "my photo.jpg") =>
  new File([new Uint8Array(1000)], name, {type});
const blob = (type = "image/jpeg", size = 400) => new Blob([new Uint8Array(size)], {type});
function adapters({sourceWidth = 4000, sourceHeight = 3000,
  compressedType = "image/jpeg", compressWidth = 1080, compressHeight = 1350,
  calls = []} = {}) {
  return {
    dimensions: async () => ({width: sourceWidth, height: sourceHeight}),
    crop: async (file, area) => { calls.push(["IMG-08", area]); return {blob: blob(file.type, 850), width: area.width, height: area.height}; },
    resize: async (file, w, h) => { calls.push(["IMG-03", w, h]); return {blob: blob(file.type, 650), width: w, height: h}; },
    compress: async (file, quality) => { calls.push(["IMG-01", quality]); return {
      blob: blob(compressedType, 500), width: compressWidth, height: compressHeight,
      reduced: true,
    }; },
  };
}

describe("Phase 22 Stage 06 / Instagram Ready photo-only browser workflow", () => {
  test("uses exactly WF-02 approved existing tool IDs; Reel stays preview-only", () => {
    const workflow = getWorkflowById("WF-02");
    expect(workflow.slug).toBe("instagram-ready");
    expect(workflow.variants.find((v) => v.id === "image").steps).toEqual(INSTAGRAM_READY_STEPS);
    expect(workflow.variants.find((v) => v.id === "video").steps).toEqual(["VID-07", "VID-01"]);
    expect(getInstagramReadyPlan().steps).toEqual(["IMG-08", "IMG-03", "IMG-01"]);
  });
  test("square / portrait / story approved dimensions are stable", () => {
    expect(INSTAGRAM_PRESETS.square).toMatchObject({width: 1080, height: 1080});
    expect(INSTAGRAM_PRESETS.portrait).toMatchObject({width: 1080, height: 1350});
    expect(INSTAGRAM_PRESETS.story).toMatchObject({width: 1080, height: 1920});
  });
  test("rejects unknown preset, arbitrary tool keys, quality, invalid focus", () => {
    expect(() => normalizeInstagramSettings({presetId: "reel"})).toThrow();
    expect(() => normalizeInstagramSettings({steps: ["IMG-01"]})).toThrow();
    expect(() => normalizeInstagramSettings({provider: "paid"})).toThrow();
    expect(() => normalizeInstagramSettings({qualityPercent: 1})).toThrow();
    expect(() => normalizeInstagramSettings({horizontalPosition: 101})).toThrow();
    expect(() => normalizeInstagramSettings({verticalPosition: -1})).toThrow();
    expect(() => normalizeInstagramSettings({qualityPercent: "80"})).toThrow();
  });
  test("rejects missing, oversized and unsupported photos", () => {
    expect(() => validateInstagramFile()).toThrow();
    expect(() => validateInstagramFile(new File([], "empty.jpg", {type: "image/jpeg"}))).toThrow();
    expect(() => validateInstagramFile(photo("image/svg+xml"))).toThrow();
    expect(() => validateInstagramFile({name: "x", size: 11 * 1024 * 1024, type: "image/jpeg"})).toThrow();
  });
  test("bounds source image geometry and rejects pixel bombs", () => {
    expect(validateInstagramSource(4000, 3000)).toEqual({width: 4000, height: 3000});
    expect(() => validateInstagramSource(9000, 100)).toThrow();
    expect(() => validateInstagramSource(6000, 5000)).toThrow();
    expect(() => validateInstagramSource(NaN, 500)).toThrow();
  });
  test("aspect crop stays inside source and respects focal positioning", () => {
    expect(getInstagramCrop({width: 4000, height: 3000}, {presetId: "square"})).toEqual({x: 500, y: 0, width: 3000, height: 3000});
    expect(getInstagramCrop({width: 4000, height: 3000}, {presetId: "square", horizontalPosition: 0}).x).toBe(0);
    expect(getInstagramCrop({width: 4000, height: 3000}, {presetId: "square", horizontalPosition: 100}).x).toBe(1000);
    const crop = getInstagramCrop({width: 3000, height: 4000}, {presetId: "story", verticalPosition: 100});
    expect(crop.width).toBe(2250);
    expect(crop.height).toBe(4000);
    expect(crop.x + crop.width).toBeLessThanOrEqual(3000);
  });
  test("never silently upscales images too small for requested pixels", () => {
    expect(() => getInstagramCrop({width: 1000, height: 1000}, {presetId: "portrait"})).toThrow(/too small/);
    expect(() => getInstagramCrop({width: 1600, height: 900}, {presetId: "story"})).toThrow(/too small/);
  });
  test("runs crop > resize > compress, returns downloadable typed file and ordered trace", async () => {
    const calls = [];
    const statuses = [];
    const result = await runInstagramReady(photo(), {presetId: "portrait", qualityPercent: 80}, {
      adapters: adapters({calls}), onStep: (e) => { if (e.status === "COMPLETED") statuses.push(e.id); },
    });
    expect(calls.map((v) => v[0])).toEqual(["IMG-08", "IMG-03", "IMG-01"]);
    expect(statuses).toEqual(["IMG-08", "IMG-03", "IMG-01"]);
    expect(result.filename).toBe("my-photo-instagram-portrait.jpg");
    expect(result.result).toMatchObject({width: 1080, height: 1350, bytes: 500, mimeType: "image/jpeg", publishComplianceVerified: false});
    expect(result.trace.map((step) => step.id)).toEqual(INSTAGRAM_READY_STEPS);
  });
  test("preserves input image format, follows actual MIME for output names", async () => {
    const png = photo("image/png", "design.png");
    const result = await runInstagramReady(png, {presetId: "portrait"}, {
      adapters: adapters({compressedType: "image/png"}),
    });
    expect(result.result.mimeType).toBe("image/png");
    expect(result.filename).toBe("design-instagram-portrait.png");
  });
  test("blocks unexpected converter, wrong pixels and wrong output sizes", async () => {
    await expect(runInstagramReady(photo(), {}, {adapters: adapters({compressedType: "image/webp"})})).rejects.toThrow(/format/);
    await expect(runInstagramReady(photo(), {}, {adapters: adapters({compressWidth: 900})})).rejects.toThrow(/dimensions/);
    const bad = adapters(); bad.crop = async () => ({blob: blob(), width: 1, height: 1});
    await expect(runInstagramReady(photo(), {}, {adapters: bad})).rejects.toThrow(/dimensions/);
  });
  test("rejects unapproved tool lists before any adapter executes", async () => {
    let called = false;
    const input = photo();
    await expect(runApprovedLocalSteps({steps: ["IMG-01", "IMG-08", "IMG-03"], input,
      operations: {"IMG-01": async () => {called = true;}}, signal: undefined})).rejects.toThrow(/approved/);
    expect(called).toBe(false);
    await expect(runApprovedLocalSteps({steps: ["VID-07", "VID-01"], input,
      operations: {}})).rejects.toThrow(/approved/);
  });
  test("preserves earlier Stage 02–05 approved sequences", async () => {
    const sequences = [
      ["IMG-03", "IMG-05", "IMG-14", "IMG-02"],
      ["IMG-05", "IMG-02"],
      ["IMG-02"],
      ["IMG-10", "IMG-02"],
    ];
    for (const steps of sequences) {
      const input = photo();
      const operations = Object.fromEntries(steps.map((id) => [id, async (file) => ({file, status: "SKIPPED"})]));
      const result = await runApprovedLocalSteps({steps, input, operations});
      expect(result.trace.length).toBe(steps.length);
    }
  });
  test("cancellation prevents any crop and any result", async () => {
    const c = new AbortController(); c.abort();
    let called = false;
    const api = adapters(); api.dimensions = async () => {called = true;};
    await expect(runInstagramReady(photo(), {}, {signal: c.signal, adapters: api})).rejects.toThrow();
    expect(called).toBe(false);
  });
  test("filename strips paths and follows output format", () => {
    expect(createInstagramFilename("../TEST weird.png", "story", "image/webp")).toBe("TEST-weird-instagram-story.webp");
    expect(() => createInstagramFilename("a.jpg", "story", "image/svg+xml")).toThrow();
  });
  test("source has no endpoints, providers, or Reel executor", () => {
    const code = readFileSync(new URL("../../lib/workflows/runInstagramReady.js", import.meta.url), "utf8");
    expect(code).not.toContain("fetch(");
    expect(code).not.toContain("/api/");
    expect(code).not.toContain("VID-07");
  });
});
