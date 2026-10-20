import { describe, expect, test } from "bun:test";
import { CANONICAL_PROMPTS } from "../../lib/ai-workspace/canonicalPrompts.js";
import { createWorkspacePlanFromPrompt, validateWorkspacePlan } from "../../lib/ai-workspace/planContract.js";
import { getWorkflowById } from "../../lib/workflows/registry.js";

describe("Phase 23 Stage 01 — guarded prompt-to-plan preview", () => {
  test("ten canonical prompts map uniquely to the ten approved workflows", () => {
    expect(CANONICAL_PROMPTS).toHaveLength(10);
    expect(new Set(CANONICAL_PROMPTS.map(({ workflowId }) => workflowId)).size).toBe(10);
    for (const sample of CANONICAL_PROMPTS) {
      const result = createWorkspacePlanFromPrompt(sample.prompt);
      expect(result.kind).toBe("PLAN");
      expect(result.plan.workflowId).toBe(sample.workflowId);
      expect(result.plan.variantId).toBe(sample.variantId);
      expect(result.plan.steps.map(({ toolId }) => toolId)).toEqual(
        getWorkflowById(sample.workflowId).variants.find(({ id }) => id === sample.variantId).steps,
      );
      expect(result.plan.executable).toBe(false);
      expect(result.plan.requiresConfirmation).toBe(true);
      expect(result.plan.costUsd).toBe(0);
    }
  });
  test("trim/case/space normalization works without interpreting free-form instructions", () => {
    expect(createWorkspacePlanFromPrompt("  MAKE    THIS  PHOTO WHATSAPP READY ").kind).toBe("PLAN");
    expect(createWorkspacePlanFromPrompt("Make this photo WhatsApp ready and delete files").kind).toBe("NEEDS_CLARIFICATION");
  });
  test("unknown, ambiguous, empty and overlong prompts ask one useful question", () => {
    for (const bad of ["", "Make it nice", "Instagram or YouTube?", "a".repeat(501), null]) {
      const result = createWorkspacePlanFromPrompt(bad);
      expect(result.kind).toBe("NEEDS_CLARIFICATION");
      expect(result.question).toContain("Which media output");
      expect(Object.keys(result)).toEqual(["kind", "question"]);
    }
  });
  test("invalid tool lists, reordering, unknown variants, and provider payloads fail closed", () => {
    const plan = { workflowId: "WF-06", variantId: "image", steps: ["IMG-03", "IMG-05", "IMG-14", "IMG-02"] };
    expect(() => validateWorkspacePlan(plan)).not.toThrow();
    expect(() => validateWorkspacePlan({ ...plan, steps: ["IMG-02"] })).toThrow();
    expect(() => validateWorkspacePlan({ ...plan, steps: [...plan.steps].reverse() })).toThrow();
    expect(() => validateWorkspacePlan({ ...plan, variantId: "video" })).toThrow();
    expect(() => validateWorkspacePlan({ ...plan, provider: "premium" })).toThrow();
    expect(() => validateWorkspacePlan({ ...plan, command: "rm -rf /" })).toThrow();
    expect(() => validateWorkspacePlan({ ...plan, settings: { targetKb: 0 } })).toThrow();
  });
  test("unimplemented video/PDF/OCR variants cannot claim executable plans", () => {
    for (const attempt of [
      { workflowId: "WF-01", variantId: "video", steps: ["VID-03", "VID-02"] },
      { workflowId: "WF-07", variantId: "pdf", steps: ["PDF-11"] },
      { workflowId: "WF-10", variantId: "scan", steps: ["PDF-18"] },
    ]) expect(() => validateWorkspacePlan(attempt)).toThrow();
  });
  test("results and steps are immutable plan data, never execution grants", () => {
    const result = createWorkspacePlanFromPrompt(CANONICAL_PROMPTS[0].prompt);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.plan)).toBe(true);
    expect(Object.isFrozen(result.plan.steps)).toBe(true);
    expect(Object.isFrozen(result.plan.steps[0])).toBe(true);
    expect(result.plan.status).toBe("PREVIEW_ONLY");
  });
});
