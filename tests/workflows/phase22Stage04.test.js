import {describe, expect, test} from "bun:test";
import {createEmailReadyFilename, EMAIL_READY_LIMITS, getEmailReadyPlan,
  normalizeEmailReadySettings, validateEmailReadyDimensions, validateEmailReadyFile} from "../../lib/workflows/emailReadyPlan.js";
import {runEmailReady} from "../../lib/workflows/runEmailReady.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";

const jpg = (name = "sample.JPG", bytes = 900_000) => new File([new Uint8Array(bytes)], name, {type: "image/jpeg"});
const png = (name = "transparent.png", bytes = 900_000) => new File([new Uint8Array(bytes)], name, {type: "image/png"});
const result = (type, bytes, originalAlreadyFits = false, width = 1200, height = 800) => ({
  blob: new Blob([new Uint8Array(bytes)], {type}), originalAlreadyFits, width, height,
});
const dimensions = async () => ({width: 1200, height: 800});

describe("Phase 22 Stage 04 / Email Ready image-only local executor", () => {
  test("uses exactly WF-07 image variant IMG-02; PDF never executes", () => {
    const plan = getEmailReadyPlan();
    expect(plan.workflowId).toBe("WF-07");
    expect(plan.variantId).toBe("image");
    expect(plan.steps).toEqual(["IMG-02"]);
    expect(plan.processingMode).toBe("BROWSER_LOCAL");
  });
  test("preset allowlist bounds the size goal and refuses arbitrary settings", () => {
    expect(normalizeEmailReadySettings().targetKb).toBe(500);
    expect(normalizeEmailReadySettings({sizePreset: "small"}).targetKb).toBe(200);
    expect(normalizeEmailReadySettings({sizePreset: "detailed"}).targetKb).toBe(1024);
    expect(() => normalizeEmailReadySettings({targetKb: 999999})).toThrow();
    expect(() => normalizeEmailReadySettings({sizePreset: "custom"})).toThrow();
    expect(() => normalizeEmailReadySettings(null)).toThrow();
  });
  test("rejects oversized, unsupported or empty file inputs", () => {
    expect(validateEmailReadyFile(jpg())).toBeTruthy();
    expect(() => validateEmailReadyFile(null)).toThrow();
    expect(() => validateEmailReadyFile({name: "a.pdf", type: "application/pdf", size: 50})).toThrow();
    expect(() => validateEmailReadyFile({name: "huge.jpg", type: "image/jpeg", size: EMAIL_READY_LIMITS.maxInputBytes + 1})).toThrow();
    expect(() => validateEmailReadyFile({name: "a.png", type: "image/png", size: 0})).toThrow();
  });
  test("bounds decoded pixel dimensions before processing", () => {
    expect(validateEmailReadyDimensions(1000, 2000).width).toBe(1000);
    for (const [w, h] of [[8001, 1], [5000, 5000], [0, 20], [Infinity, 100]]) {
      expect(() => validateEmailReadyDimensions(w, h)).toThrow();
    }
  });
  test("one approved step produces a correctly typed downloadable JPEG and trace", async () => {
    let calls = 0;
    const statuses = [];
    const prepared = await runEmailReady(jpg(), {sizePreset: "balanced"}, {
      adapters: {dimensions, compress: async (_, target) => {
        calls += 1;
        expect(target).toBe(500);
        return result("image/jpeg", 440_000);
      }}, onStep: ({status}) => statuses.push(status),
    });
    expect(calls).toBe(1);
    expect(statuses).toEqual(["PROCESSING", "COMPLETED"]);
    expect(prepared.trace).toHaveLength(1);
    expect(prepared.result.reachedTarget).toBe(true);
    expect(prepared.result.mimeType).toBe("image/jpeg");
    expect(prepared.filename).toBe("sample-email-ready.jpg");
    expect(prepared.result.bytes).toBe(440000);
  });
  test("keeps PNG when already under target, but accepts real compressor's PNG to WebP", async () => {
    const original = png("my family.png", 120_000);
    const noChange = await runEmailReady(original, {sizePreset: "small"}, {
      adapters: {dimensions, compress: async (file) => ({blob: file, originalAlreadyFits: true, width: 1200, height: 800})},
    });
    expect(noChange.result.mimeType).toBe("image/png");
    expect(noChange.filename).toBe("my-family-email-ready.png");
    expect(noChange.trace[0].status).toBe("SKIPPED");
    const changed = await runEmailReady(png(), {sizePreset: "small"}, {
      adapters: {dimensions, compress: async () => result("image/webp", 205_000)},
    });
    expect(changed.result.mimeType).toBe("image/webp");
    expect(changed.filename).toBe("transparent-email-ready.webp");
    expect(changed.result.reachedTarget).toBe(false);
  });
  test("rejects a processor switching JPEG to another format without approval", async () => {
    await expect(runEmailReady(jpg(), {}, {
      adapters: {dimensions, compress: async () => result("image/webp", 150_000)},
    })).rejects.toThrow("unsupported or empty");
  });
  test("blocks invalid output size or unexpected scaling", async () => {
    await expect(runEmailReady(jpg(), {}, {
      adapters: {dimensions, compress: async () => result("image/jpeg", 120_000, false, 2400, 1600)},
    })).rejects.toThrow("unexpected output dimensions");
    await expect(runEmailReady(jpg(), {}, {
      adapters: {dimensions, compress: async () => result("image/jpeg", 10 * 1024 * 1024 + 1)},
    })).rejects.toThrow("too large");
  });
  test("cannot run invented, reordered or PDF tool sequences", async () => {
    for (const steps of [["PDF-11"], ["IMG-05"], ["IMG-02", "IMG-05"], []]) {
      await expect(runApprovedLocalSteps({steps, input: jpg(), operations: {"IMG-02": async () => ({file: jpg(), status: "COMPLETED"})}})).rejects.toThrow("not approved");
    }
  });
  test("stops before dispatch when user cancels", async () => {
    const controller = new AbortController();
    controller.abort();
    let called = false;
    await expect(runEmailReady(jpg(), {}, {
      signal: controller.signal, adapters: {dimensions: async () => {called = true; return {width: 1, height: 1};}, compress: async () => result("image/jpeg", 200)},
    })).rejects.toThrow("cancelled");
    expect(called).toBe(false);
  });
  test("bounded output filenames follow the ACTUAL image MIME", () => {
    expect(createEmailReadyFilename("../../odd🔥.png", "image/webp")).toMatch(/-email-ready\.webp$/);
    expect(createEmailReadyFilename("name.jpg", "image/jpeg")).toBe("name-email-ready.jpg");
    expect(() => createEmailReadyFilename("a", "application/pdf")).toThrow();
  });
});
