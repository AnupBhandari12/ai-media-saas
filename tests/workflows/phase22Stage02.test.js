import {describe, expect, test} from "bun:test";
import {getWebsiteReadyPlan, normalizeWebsiteReadySettings,
  validateWebsiteReadyFile, computeResizedDimensions, createWebsiteReadyFilename} from "../../lib/workflows/websiteReadyPlan.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runWebsiteReady} from "../../lib/workflows/runWebsiteReady.js";

function fakeImage(type = "image/png", bytes = 1200) {
  return new File([new Uint8Array(bytes)], "my example.png", {type});
}

const blob = (bytes, type) => new Blob([new Uint8Array(bytes)], {type});

const mockAdapters = {
  dimensions: async () => ({width: 2000, height: 1000}),
  resize: async (file, width, height) => ({blob: blob(1000, file.type), width, height}),
  convert: async (file, type) => ({blob: blob(900, type), width: 1600, height: 800}),
  removeMetadata: async (file) => ({blob: blob(850, file.type), width: 1600, height: 800}),
  compress: async (file, targetKb) => ({blob: blob(700, file.type), width: 1600, height: 800, reachedTarget: true, originalAlreadyFits: false, targetKb}),
};

describe("Phase 22 Stage 02 / Website Ready local executor", () => {
  test("uses exactly the Stage 01 approved WF-06 image steps", () => {
    expect(getWebsiteReadyPlan().steps).toEqual(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]);
    expect(getWebsiteReadyPlan().processingMode).toBe("BROWSER_LOCAL");
  });

  test("bounds dimensions, target and output formats", () => {
    expect(normalizeWebsiteReadySettings({longSide: 1600, targetKb: 400, outputMimeType: "image/webp"}).targetKb).toBe(400);
    expect(() => normalizeWebsiteReadySettings({targetKb: 5})).toThrow();
    expect(() => normalizeWebsiteReadySettings({longSide: 25000})).toThrow();
    expect(() => normalizeWebsiteReadySettings({outputMimeType: "image/svg+xml"})).toThrow();
    expect(() => normalizeWebsiteReadySettings({provider: "paid"})).toThrow();
  });

  test("rejects unsupported or oversized inputs", () => {
    expect(() => validateWebsiteReadyFile(fakeImage("image/svg+xml"))).toThrow();
    expect(() => validateWebsiteReadyFile({name:"big.png", size:10*1024*1024+1, type:"image/png"})).toThrow();
    expect(() => validateWebsiteReadyFile(fakeImage())).not.toThrow();
  });

  test("preserves aspect ratio; never upscales; bounds pixel count", () => {
    expect(computeResizedDimensions(2000,1000,1600)).toEqual({width:1600,height:800,skipped:false});
    expect(computeResizedDimensions(400,200,1600).skipped).toBe(true);
    expect(() => computeResizedDimensions(12000,12000,1600)).toThrow();
  });

  test("rejects invented step lists and missing adapters", async () => {
    await expect(runApprovedLocalSteps({steps:["IMG-03","SHELL","IMG-14","IMG-02"], input:fakeImage(), operations:{}})).rejects.toThrow();
    await expect(runApprovedLocalSteps({steps:getWebsiteReadyPlan().steps, input:fakeImage(), operations:{}})).rejects.toThrow();
  });

  test("runs 4 local steps in registry order and returns a downloadable file", async () => {
    const called = [];
    const statuses = [];
    const adapters = Object.fromEntries(Object.entries(mockAdapters).map(([key, fn]) => [key, async (...args) => {
      called.push(key);
      return fn(...args);
    }]));
    const result = await runWebsiteReady(fakeImage(), {}, {
      adapters,
      onStep: (event) => { if (event.status === "COMPLETED") statuses.push(event.id); },
    });
    expect(called).toEqual(["dimensions", "resize", "convert", "removeMetadata", "compress"]);
    expect(statuses).toEqual(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]);
    expect(result.result).toMatchObject({bytes:700,width:1600,height:800,targetReached:true,mimeType:"image/webp"});
    expect(result.filename).toBe("my-example-website-ready.webp");
    expect(result.trace).toHaveLength(4);
  });

  test("prevents unsupported actual output format", async () => {
    await expect(runWebsiteReady(fakeImage(), {}, {
      adapters: {...mockAdapters, convert: async () => ({blob: blob(900,"image/png")})},
    })).rejects.toThrow("Unexpected output format");
  });

  test("stops safely before work when aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(runWebsiteReady(fakeImage(), {}, {adapters: mockAdapters, signal:controller.signal})).rejects.toThrow();
  });

  test("filename is bounded and extension follows output type", () => {
    expect(createWebsiteReadyFilename("hello.png", "image/jpeg")).toBe("hello-website-ready.jpg");
    expect(createWebsiteReadyFilename("A page image.JPG", "image/webp")).toBe("A-page-image-website-ready.webp");
  });
});
