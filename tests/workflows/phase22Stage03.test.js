import {describe, expect, test} from "bun:test";
import {getWhatsAppReadyPlan, normalizeWhatsAppReadySettings,
  validateWhatsAppReadyFile, validateWhatsAppReadyDimensions, createWhatsAppReadyFilename} from "../../lib/workflows/whatsAppReadyPlan.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";
import {runWhatsAppReady} from "../../lib/workflows/runWhatsAppReady.js";

const makeFile = (mimeType = "image/png", size = 2000, name = "my photo.png") =>
  new File([new Uint8Array(size)], name, {type: mimeType});
const makeBlob = (size, type = "image/jpeg") => new Blob([new Uint8Array(size)], {type});
const adapters = {
  dimensions: async () => ({width: 2400, height: 1200}),
  convert: async () => ({blob: makeBlob(1500)}),
  compress: async (_file, targetKb) => ({blob: makeBlob(900), width: 1800,
    height: 900, reachedTarget: true, originalAlreadyFits: false, targetKb}),
};

describe("Phase 22 Stage 03 / WhatsApp Ready photo-only local workflow", () => {
  test("uses exactly the WF-01 image-branch tool IDs, not video", () => {
    const plan = getWhatsAppReadyPlan();
    expect(plan.workflowId).toBe("WF-01");
    expect(plan.variantId).toBe("image");
    expect(plan.processingMode).toBe("BROWSER_LOCAL");
    expect(plan.steps).toEqual(["IMG-05", "IMG-02"]);
  });
  test("prevents client-defined tool lists, providers and size settings", () => {
    expect(normalizeWhatsAppReadySettings({sizePreset: "smaller"}).targetKb).toBe(150);
    expect(normalizeWhatsAppReadySettings({sizePreset: "balanced"}).targetKb).toBe(350);
    expect(normalizeWhatsAppReadySettings({sizePreset: "clearer"}).targetKb).toBe(700);
    expect(() => normalizeWhatsAppReadySettings({targetKb: 10000})).toThrow();
    expect(() => normalizeWhatsAppReadySettings({provider: "paid"})).toThrow();
    expect(() => normalizeWhatsAppReadySettings({sizePreset: "unknown"})).toThrow();
  });
  test("validates photo type, size and decoded dimensions", () => {
    expect(() => validateWhatsAppReadyFile(makeFile())).not.toThrow();
    expect(() => validateWhatsAppReadyFile(makeFile("image/svg+xml"))).toThrow();
    expect(() => validateWhatsAppReadyFile(makeFile("image/png", 10485761))).toThrow();
    expect(() => validateWhatsAppReadyFile(makeFile("image/png", 0))).toThrow();
    expect(() => validateWhatsAppReadyDimensions(2400, 1200)).not.toThrow();
    expect(() => validateWhatsAppReadyDimensions(9000, 100)).toThrow();
    expect(() => validateWhatsAppReadyDimensions(8000, 4000)).toThrow();
  });
  test("approves Website Ready + WhatsApp only; forbids arbitrary tool arrays", async () => {
    const input = makeFile();
    await expect(runApprovedLocalSteps({steps: ["IMG-02", "IMG-05"], input, operations: {}})).rejects.toThrow();
    await expect(runApprovedLocalSteps({steps: ["IMG-05", "SHELL"], input, operations: {}})).rejects.toThrow();
    await expect(runApprovedLocalSteps({steps: ["IMG-05", "IMG-02", "IMG-05"], input, operations: {}})).rejects.toThrow();
    await expect(runApprovedLocalSteps({steps: ["IMG-05", "IMG-02"], input, operations: {}})).rejects.toThrow("adapter");
  });
  test("converts PNG then compresses JPG with ordered trace and sizes", async () => {
    const calls = []; const events = [];
    const spies = Object.fromEntries(Object.entries(adapters).map(([name, fn]) => [name, async (...args) => {
      calls.push(name); return fn(...args);
    }]));
    const result = await runWhatsAppReady(makeFile(), {}, {
      adapters: spies, onStep: (event) => events.push(event),
    });
    expect(calls).toEqual(["dimensions", "convert", "compress"]);
    expect(result.trace.map((item) => item.id)).toEqual(["IMG-05", "IMG-02"]);
    expect(result.trace.every((item) => item.status === "COMPLETED")).toBe(true);
    expect(events.filter((event) => event.status === "PROCESSING")).toHaveLength(2);
    expect(result.result).toMatchObject({bytes: 900, width: 1800, height: 900,
      mimeType: "image/jpeg", reachedTarget: true, targetKb: 350});
    expect(result.filename).toBe("my-photo-whatsapp-ready.jpg");
    expect(result.processingMode).toBe("BROWSER_LOCAL");
  });
  test("already JPEG skips conversion; small output can skip compression", async () => {
    const result = await runWhatsAppReady(makeFile("image/jpeg"), {}, {
      adapters: {...adapters, convert: async () => {throw new Error("Unexpected convert call");},
        compress: async () => ({blob: makeBlob(400), width: 2400, height: 1200,
          reachedTarget: true, originalAlreadyFits: true})},
    });
    expect(result.trace.map((item) => item.status)).toEqual(["SKIPPED", "SKIPPED"]);
    expect(result.blob.type).toBe("image/jpeg");
  });
  test("wrong MIME / empty output / unexpected upscaling fail closed", async () => {
    await expect(runWhatsAppReady(makeFile(), {}, {adapters: {...adapters,
      convert: async () => ({blob: makeBlob(900, "image/png")})}})).rejects.toThrow("valid JPG");
    await expect(runWhatsAppReady(makeFile(), {}, {adapters: {...adapters,
      compress: async () => ({blob: makeBlob(900, "image/webp"), width: 1800, height: 900})}})).rejects.toThrow("valid JPG");
    await expect(runWhatsAppReady(makeFile(), {}, {adapters: {...adapters,
      compress: async () => ({blob: makeBlob(900), width: 3000, height: 1500})}})).rejects.toThrow("dimensions");
    await expect(runWhatsAppReady(makeFile(), {}, {adapters: {...adapters,
      compress: async () => ({blob: makeBlob(0), width: 1800, height: 900})}})).rejects.toThrow("valid JPG");
  });
  test("unattainable goal is reported, not called a success", async () => {
    const result = await runWhatsAppReady(makeFile(), {}, {adapters: {...adapters,
      compress: async () => ({blob: makeBlob(360000), width: 1800, height: 900,
        reachedTarget: false, originalAlreadyFits: false})}});
    expect(result.result.reachedTarget).toBe(false);
    expect(result.result.bytes).toBe(360000);
  });
  test("cancel before work blocks adapters and completed download", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(runWhatsAppReady(makeFile(), {}, {signal: controller.signal,
      adapters: {...adapters, dimensions: async () => {throw new Error("Unexpected decode");}}})).rejects.toThrow();
  });
  test("cancel after decode also blocks conversion", async () => {
    const controller = new AbortController();
    await expect(runWhatsAppReady(makeFile(), {}, {signal: controller.signal,
      adapters: {...adapters, dimensions: async () => {controller.abort(); return {width:1000,height:500};},
        convert: async () => {throw new Error("Unexpected convert");}}})).rejects.toThrow();
  });
  test("uses bounded, safe download names", () => {
    expect(createWhatsAppReadyFilename("A family photo.PNG")).toBe("A-family-photo-whatsapp-ready.jpg");
    expect(createWhatsAppReadyFilename("...***")).toBe("photo-whatsapp-ready.jpg");
    expect(createWhatsAppReadyFilename("a".repeat(300))).toHaveLength(89);
  });
});
