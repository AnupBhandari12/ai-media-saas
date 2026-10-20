import {describe, expect, test} from "bun:test";
import {createJobFormFilename, getJobFormReadyPlan, JOB_FORM_PRESETS, JOB_FORM_READY_LIMITS,
  normalizeJobFormSettings, validateJobFormFile, validateJobFormInputDimensions} from "../../lib/workflows/jobFormReadyPlan.js";
import {runJobFormReady} from "../../lib/workflows/runJobFormReady.js";
import {runApprovedLocalSteps} from "../../lib/workflows/runLocalWorkflow.js";

const photo = (type = "image/jpeg", name = "portrait.jpg", bytes = 2500) =>
  new File([new Uint8Array(bytes)], name, {type});
const blob = (bytes = 2000, type = "image/jpeg") => new Blob([new Uint8Array(bytes)], {type});
const adapters = ({passport, compress, dimensions} = {}) => ({
  dimensions: dimensions || (async () => ({width: 1200, height: 1600})),
  passport: passport || (async (_file, config) => ({blob: blob(2500), width: config.width, height: config.height})),
  compress: compress || (async (_file, _target) => ({blob: blob(1600), width: 413, height: 531})),
});

describe("Phase 22 Stage 05 / Job & Form Ready browser-local photo beta", () => {
  test("approved registry WF-08 executes ONLY IMG-10 then IMG-02; never PDF", () => {
    const plan = getJobFormReadyPlan();
    expect(plan.workflowId).toBe("WF-08");
    expect(plan.variantId).toBe("photo");
    expect(plan.steps).toEqual(["IMG-10", "IMG-02"]);
    expect(plan.processingMode).toBe("BROWSER_LOCAL");
  });
  test("keeps exact reviewed passport, square and form pixel presets", () => {
    expect(JOB_FORM_PRESETS.passport.width).toBe(413);
    expect(normalizeJobFormSettings().height).toBe(531);
    expect(normalizeJobFormSettings({presetId: "square"}).width).toBe(600);
    expect(normalizeJobFormSettings({presetId: "form"}).height).toBe(800);
  });
  test("validates custom dimensions and explicitly rejects bad numbers", () => {
    expect(normalizeJobFormSettings({presetId: "custom", width: 320, height: 400}).width).toBe(320);
    expect(normalizeJobFormSettings({presetId: "custom", width: 1600, height: 1600}).width).toBe(1600);
    expect(() => normalizeJobFormSettings({presetId: "custom", width: 1601, height: 1500})).toThrow();
    expect(() => normalizeJobFormSettings({presetId: "custom", width: 1, height: 200})).toThrow();
    expect(() => normalizeJobFormSettings({presetId: "custom", width: 300.5, height: 400})).toThrow();
    expect(() => normalizeJobFormSettings({presetId: "passport", width: 300})).toThrow();
  });
  test("settings allowlist blocks arbitrary steps, fake providers and invalid framing", () => {
    expect(() => normalizeJobFormSettings({steps: ["PDF-11"]})).toThrow();
    expect(() => normalizeJobFormSettings({provider: "remote"})).toThrow();
    expect(() => normalizeJobFormSettings({targetKb: 999999})).toThrow();
    expect(() => normalizeJobFormSettings({zoom: 100})).toThrow();
    expect(() => normalizeJobFormSettings({verticalPosition: -1})).toThrow();
    expect(() => normalizeJobFormSettings(null)).toThrow();
    expect(normalizeJobFormSettings({targetKb: 100, zoom: 1.25, verticalPosition: 25}).targetKb).toBe(100);
  });
  test("rejects oversized, empty or unsupported input photos", () => {
    expect(validateJobFormFile(photo())).toBeTruthy();
    expect(() => validateJobFormFile(null)).toThrow();
    expect(() => validateJobFormFile({name: "source.pdf", type: "application/pdf", size: 100})).toThrow();
    expect(() => validateJobFormFile({name: "large.jpg", type: "image/jpeg", size: JOB_FORM_READY_LIMITS.maxInputBytes + 1})).toThrow();
    expect(() => validateJobFormFile({name: "empty.png", type: "image/png", size: 0})).toThrow();
  });
  test("rejects oversized decoded input and pixel bombs", () => {
    expect(validateJobFormInputDimensions(1200, 1600).height).toBe(1600);
    for (const [w, h] of [[8001, 50], [5000, 5000], [0, 600], [Infinity, 100], [1.5, 100]]) {
      expect(() => validateJobFormInputDimensions(w, h)).toThrow();
    }
  });
  test("runs exactly two ordered local tools and produces a JPG with the expected pixels", async () => {
    const order = [], events = [];
    const result = await runJobFormReady(photo("image/png", "person.png"), {}, {
      adapters: adapters({
        passport: async (_, options) => {order.push("IMG-10"); expect(options.outputMimeType).toBe("image/jpeg"); return {blob: blob(2300), width: 413, height: 531};},
        compress: async (_, targetKb) => {order.push("IMG-02"); expect(targetKb).toBe(200); return {blob: blob(1500), width: 413, height: 531};},
      }), onStep: ({status}) => events.push(status),
    });
    expect(order).toEqual(["IMG-10", "IMG-02"]);
    expect(events).toEqual(["PROCESSING", "COMPLETED", "PROCESSING", "COMPLETED"]);
    expect(result.result.width).toBe(413);
    expect(result.result.height).toBe(531);
    expect(result.result.mimeType).toBe("image/jpeg");
    expect(result.result.reachedTarget).toBe(true);
    expect(result.result.formComplianceVerified).toBe(false);
    expect(result.filename).toBe("person-form-413x531.jpg");
    expect(result.trace).toHaveLength(2);
  });
  test("custom exact pixels and user framing are sent to source photo-maker", async () => {
    const result = await runJobFormReady(photo(), {presetId: "custom", width: 340, height: 460,
      zoom: 1.35, verticalPosition: 30, targetKb: 500}, {
      adapters: adapters({
        passport: async (_, opts) => {
          expect(opts.zoom).toBe(1.35); expect(opts.verticalPosition).toBe(30);
          return {blob: blob(2100), width: 340, height: 460};
        },
        compress: async () => ({blob: blob(1800), width: 340, height: 460}),
      }),
    });
    expect(result.filename).toBe("portrait-form-340x460.jpg");
  });
  test("blocks dimensions altered by the compressor even if byte goal was reached", async () => {
    await expect(runJobFormReady(photo(), {}, {adapters: adapters({
      compress: async () => ({blob: blob(1300), width: 400, height: 520}),
    })})).rejects.toThrow("required form photo dimensions");
  });
  test("blocks ID maker that returns PNG or incorrect pixel dimensions", async () => {
    await expect(runJobFormReady(photo(), {}, {adapters: adapters({
      passport: async () => ({blob: blob(100, "image/png"), width: 413, height: 531}),
    })})).rejects.toThrow("unsupported");
    await expect(runJobFormReady(photo(), {}, {adapters: adapters({
      passport: async () => ({blob: blob(200), width: 300, height: 300}),
    })})).rejects.toThrow("required form photo dimensions");
  });
  test("unmet size goal is warned rather than falsely declaring form compliance", async () => {
    const out = await runJobFormReady(photo(), {targetKb: 100}, {adapters: adapters({
      compress: async () => ({blob: blob(150 * 1024), width: 413, height: 531}),
    })});
    expect(out.result.reachedTarget).toBe(false);
    expect(out.result.formComplianceVerified).toBe(false);
  });
  test("reports SKIPPED if source already fits after IMG-10", async () => {
    const out = await runJobFormReady(photo(), {}, {adapters: adapters({
      compress: async (input) => ({blob: input, originalAlreadyFits: true, width: 413, height: 531}),
    })});
    expect(out.trace[1].status).toBe("SKIPPED");
  });
  test("rejects nonexistent processor and respects cancellation before dispatch", async () => {
    await expect(runJobFormReady(photo(), {}, {adapters: {dimensions: async () => ({width: 1, height: 1})}})).rejects.toThrow("unavailable");
    const abort = new AbortController();
    abort.abort();
    let called = false;
    await expect(runJobFormReady(photo(), {}, {signal: abort.signal, adapters: adapters({
      dimensions: async () => {called = true; return {width: 1, height: 1};},
    })})).rejects.toThrow("cancelled");
    expect(called).toBe(false);
  });
  test("blocks invented, reversed or PDF workflows while preserving previous Stage02–04", async () => {
    const input = photo();
    const adapter = {"IMG-02": async () => ({file: input, status: "SKIPPED"})};
    for (const steps of [["PDF-11"], ["IMG-02", "IMG-10"], ["IMG-10"], []]) {
      await expect(runApprovedLocalSteps({steps, input, operations: adapter})).rejects.toThrow("not approved");
    }
    for (const steps of [
      ["IMG-03", "IMG-05", "IMG-14", "IMG-02"],
      ["IMG-05", "IMG-02"], ["IMG-02"],
    ]) {
      const ops = Object.fromEntries(steps.map((id) => [id, async () => ({file: input, status: "SKIPPED"})]));
      const run = await runApprovedLocalSteps({steps, input, operations: ops});
      expect(run.trace).toHaveLength(steps.length);
    }
  });
  test("output names are safe, bounded and actually JPG", () => {
    expect(createJobFormFilename("person.PNG", 413, 531)).toBe("person-form-413x531.jpg");
    expect(createJobFormFilename("../../danger🔥.jpeg", 300, 400)).toMatch(/-form-300x400\.jpg$/);
    expect(() => createJobFormFilename("file", 0, 0)).toThrow();
  });
});
