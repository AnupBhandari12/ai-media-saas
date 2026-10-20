import { describe, expect, test } from "bun:test";
import { CANONICAL_PROMPTS } from "../../lib/ai-workspace/canonicalPrompts.js";
import { understandWorkspacePrompt } from "../../lib/ai-workspace/interpretPrompt.js";
import { createWorkspaceReview, acknowledgeWorkspacePlan } from "../../lib/ai-workspace/reviewGate.js";

describe("Phase 23 Stage 03 — safe human review (NO execution)", () => {
  test("all ten canonical plans can be reviewed but never executed", () => {
    for (const item of CANONICAL_PROMPTS) {
      const result = understandWorkspacePrompt(item.prompt);
      expect(result.kind).toBe("PLAN");
      const review = createWorkspaceReview(result.plan);
      expect(review.status).toBe("REVIEW_REQUIRED");
      expect(review.workflowId).toBe(item.workflowId);
      expect(review.workflowHref.startsWith("/workflows/")).toBe(true);
      expect(review.previewChargeUsd).toBe(0);
      expect(review.noExecution).toBe(true);
      expect(Object.isFrozen(review.steps)).toBe(true);
    }
  });

  test("ten natural-language paraphrases retain the same safe gate", () => {
    for (const prompt of [
      "Make my WhatsApp picture smaller", "Crop this image for Instagram",
      "Prepare my Facebook picture", "Optimize a LinkedIn post image",
      "Make a thumbnail image for YouTube", "Resize this photo for my website",
      "Make this email attachment image smaller", "Prepare a passport photo for my job application",
      "Create a product image pack for my online store", "Turn my lecture photos into PDF notes",
    ]) {
      const result = understandWorkspacePrompt(prompt);
      expect(result.kind).toBe("PLAN");
      expect(createWorkspaceReview(result.plan).noExecution).toBe(true);
    }
  });

  test("acknowledgement is required and never creates execution permission", () => {
    const { plan } = understandWorkspacePrompt(CANONICAL_PROMPTS[0].prompt);
    expect(acknowledgeWorkspacePlan(plan, false)).toEqual({kind:"CONFIRMATION_REQUIRED", executable:false});
    expect(acknowledgeWorkspacePlan(plan, "true").kind).toBe("CONFIRMATION_REQUIRED");
    const receipt = acknowledgeWorkspacePlan(plan, true);
    expect(receipt.kind).toBe("ACKNOWLEDGED_FOR_NAVIGATION");
    expect(receipt.workflowHref).toBe("/workflows/whatsapp-ready");
    expect(receipt.executable).toBe(false);
    expect(receipt.noExecution).toBe(true);
    expect(Object.isFrozen(receipt)).toBe(true);
    expect(receipt).not.toHaveProperty("token");
    expect(receipt).not.toHaveProperty("provider");
  });

  test("rejects extra commands, settings, spoofed costs and execution flags", () => {
    const { plan } = understandWorkspacePrompt(CANONICAL_PROMPTS[5].prompt);
    for (const invalid of [
      { ...plan, executable: true }, { ...plan, costUsd: 100 },
      { ...plan, requiresConfirmation: false }, { ...plan, provider: "premium" },
      { ...plan, command: "rm" }, { ...plan, settings: { admin: true } },
      { ...plan, status: "APPROVED" }, { ...plan, source: "UNTRUSTED_LLM" },
      { ...plan, workflowSlug: "admin" }, { ...plan, workflowName: "Something else" },
      { ...plan, variantName: "Video" },
    ]) expect(() => createWorkspaceReview(invalid)).toThrow();
  });

  test("rejects tampered, missing and reordered step details", () => {
    const { plan } = understandWorkspacePrompt(CANONICAL_PROMPTS[5].prompt);
    for (const steps of [
      [], plan.steps.slice(1), [...plan.steps].reverse(),
      plan.steps.map((s, i) => i === 0 ? { ...s, toolId: "IMG-99" } : s),
      plan.steps.map((s, i) => i === 0 ? { ...s, route: "/admin" } : s),
      plan.steps.map((s, i) => i === 0 ? { ...s, name: "Free premium" } : s),
      plan.steps.map((s, i) => i === 0 ? { ...s, order: 42 } : s),
      plan.steps.map((s, i) => i === 0 ? { ...s, executor: "shell" } : s),
    ]) expect(() => createWorkspaceReview({ ...plan, steps })).toThrow();
  });

  test("rejects unknown plan types and prototype tricks", () => {
    for (const invalid of [null, undefined, "fake", [], {kind:"NEEDS_CLARIFICATION"}, Object.create({executable:true})]) {
      expect(() => createWorkspaceReview(invalid)).toThrow();
    }
  });
});
