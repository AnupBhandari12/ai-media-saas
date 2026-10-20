import { describe, expect, test } from "bun:test";
import { CANONICAL_PROMPTS } from "../../lib/ai-workspace/canonicalPrompts.js";
import { UNDERSTANDING_EXAMPLES, understandWorkspacePrompt } from "../../lib/ai-workspace/interpretPrompt.js";
import { getWorkflowById } from "../../lib/workflows/registry.js";

describe("Phase 23 Stage 02 — conservative prompt understanding", () => {
  test("ten new English paraphrases map to the registered approved variant", () => {
    expect(UNDERSTANDING_EXAMPLES).toHaveLength(10);
    for (const example of UNDERSTANDING_EXAMPLES) {
      const result = understandWorkspacePrompt(example.prompt);
      expect(result.kind).toBe("PLAN");
      expect(result.plan.workflowId).toBe(example.workflowId);
      expect(result.plan.source).toBe("DETERMINISTIC_INTENT");
      expect(result.plan.executable).toBe(false);
      expect(result.plan.requiresConfirmation).toBe(true);
      expect(result.plan.costUsd).toBe(0);
      const variant = getWorkflowById(result.plan.workflowId).variants.find((item) => item.id === result.plan.variantId);
      expect(result.plan.steps.map((step) => step.toolId)).toEqual(variant.steps);
    }
  });
  test("Stage 01 canonical requests still produce identical exact plans", () => {
    for (const example of CANONICAL_PROMPTS) {
      const result = understandWorkspacePrompt(example.prompt);
      expect(result.kind).toBe("PLAN");
      expect(result.plan.workflowId).toBe(example.workflowId);
      expect(result.plan.variantId).toBe(example.variantId);
      expect(result.plan.source).toBe("CANONICAL_EXAMPLE");
    }
  });
  test("trimming, punctuation and casing work without speculative provider inference", () => {
    const r = understandWorkspacePrompt("  RESIZE this PHOTO for my WEBSITE!!!  ");
    expect(r.kind).toBe("PLAN");
    expect(r.plan.workflowId).toBe("WF-06");
    expect(understandWorkspacePrompt("Make it better").kind).toBe("NEEDS_CLARIFICATION");
    expect(understandWorkspacePrompt("Instagram").kind).toBe("NEEDS_CLARIFICATION");
  });
  test("ambiguous two-destination requests never auto-select one", () => {
    for (const prompt of [
      "Instagram photo and Facebook picture",
      "Email my WhatsApp photo",
      "LinkedIn image for my website",
      "YouTube thumbnail for my ecommerce product",
    ]) {
      const r = understandWorkspacePrompt(prompt);
      expect(r.kind).toBe("NEEDS_CLARIFICATION");
      expect(r.question).toContain("ONE");
    }
  });
  test("unsupported media, variants, automatic sending and direct commands are clarification-only", () => {
    for (const prompt of [
      "Convert WhatsApp video", "Create Instagram reel", "Make YouTube video",
      "Resize LinkedIn profile photo", "Compress email PDF", "OCR scanned student notes PDF from photos",
      "Delete my website image", "Send this WhatsApp photo", "Publish my Facebook photo",
      "Use provider command for Instagram image", "Run shell command on website photo",
      "Instagram photo 200kb", "Website image 1024x768", "Website image 500px",
    ]) {
      const r = understandWorkspacePrompt(prompt);
      expect(r.kind).toBe("NEEDS_CLARIFICATION");
      expect(r).not.toHaveProperty("plan");
    }
  });
  test("bad, empty and overlong inputs fail closed", () => {
    for (const bad of [null, undefined, {}, 1, "", " ", "x".repeat(501)]) {
      const result = understandWorkspacePrompt(bad);
      expect(result.kind).toBe("NEEDS_CLARIFICATION");
      expect(Object.keys(result)).toEqual(["kind", "question"]);
    }
  });
  test("result is immutable preview data and cannot grant execution", () => {
    const { plan } = understandWorkspacePrompt("Crop my Instagram image");
    expect(Object.isFrozen(plan)).toBe(true);
    expect(Object.isFrozen(plan.steps)).toBe(true);
    expect(Object.isFrozen(plan.steps[0])).toBe(true);
    expect(plan.status).toBe("PREVIEW_ONLY");
    expect(plan.executable).toBe(false);
  });
});
