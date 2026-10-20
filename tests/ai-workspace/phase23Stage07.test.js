import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { CANONICAL_PROMPTS } from "../../lib/ai-workspace/canonicalPrompts.js";
import { UNDERSTANDING_EXAMPLES, understandWorkspacePrompt } from "../../lib/ai-workspace/interpretPrompt.js";
import { createWorkspaceReview, acknowledgeWorkspacePlan } from "../../lib/ai-workspace/reviewGate.js";
import { createWorkspaceLocalRunOffer } from "../../lib/ai-workspace/localExecutionBridge.js";
import { validateHistorySave, validateHistoryPatch, publicHistoryRecord } from "../../lib/ai-workspace/historyContract.js";

const read = path => readFileSync(path, "utf8");
const planFrom = prompt => {
  const result = understandWorkspacePrompt(prompt);
  expect(result.kind).toBe("PLAN");
  return result.plan;
};

describe("Phase 23 Stage 07 — ten-workflow integration and release gates", () => {
  test("all ten canonical requests pass interpretation, validation and review without execution", () => {
    expect(CANONICAL_PROMPTS.length).toBe(10);
    expect(new Set(CANONICAL_PROMPTS.map(entry => entry.workflowId)).size).toBe(10);
    for (const entry of CANONICAL_PROMPTS) {
      const plan = planFrom(entry.prompt);
      const review = createWorkspaceReview(plan);
      expect(plan.workflowId).toBe(entry.workflowId);
      expect(plan.variantId).toBe(entry.variantId);
      expect(plan.executable).toBe(false);
      expect(plan.requiresConfirmation).toBe(true);
      expect(review.noExecution).toBe(true);
      expect(review.workflowHref.startsWith("/workflows/")).toBe(true);
      expect(acknowledgeWorkspacePlan(plan, false).kind).toBe("CONFIRMATION_REQUIRED");
      const receipt = acknowledgeWorkspacePlan(plan, true);
      expect(receipt.executable).toBe(false);
      expect(receipt.workflowHref).toBe(review.workflowHref);
      expect(createWorkspaceLocalRunOffer(plan, false).canRun).toBe(false);
      const offer = createWorkspaceLocalRunOffer(plan, true);
      expect(offer.kind).toBe(entry.workflowId === "WF-06"
        ? "BROWSER_LOCAL_WEBSITE_READY" : "OPEN_EXISTING_WORKFLOW");
      expect(offer.canRun).toBe(entry.workflowId === "WF-06");
    }
  });

  test("all ten natural-language examples remain bounded and map to approved variants", () => {
    expect(UNDERSTANDING_EXAMPLES.length).toBe(10);
    for (const entry of UNDERSTANDING_EXAMPLES) {
      const plan = planFrom(entry.prompt);
      expect(plan.workflowId).toBe(entry.workflowId);
      expect(createWorkspaceReview(plan).noExecution).toBe(true);
    }
  });

  test("ambiguous, unsupported and explicit-setting requests cannot bypass confirmation", () => {
    for (const prompt of [
      "Send a website image to Instagram and WhatsApp",
      "Create a video for Instagram",
      "Prepare a 400x200 website image",
      "Delete all my PDF files",
      "Publish a Facebook image automatically",
      "",
      "x".repeat(501),
    ]) {
      expect(understandWorkspacePrompt(prompt).kind).toBe("NEEDS_CLARIFICATION");
    }
    const plan = planFrom(CANONICAL_PROMPTS[5].prompt);
    for (const invalid of [
      { ...plan, steps: [...plan.steps].reverse() },
      { ...plan, executable: true },
      { ...plan, instructions: "run without review" },
    ]) expect(() => createWorkspaceReview(invalid)).toThrow();
  });

  test("history save accepts only registered metadata and status remains manual", () => {
    for (const {workflowId, variantId, prompt} of CANONICAL_PROMPTS) {
      const data = validateHistorySave({prompt, workflowId, variantId});
      expect(data.workflowId).toBe(workflowId);
      expect(data.taskStatus).toBe("SAVED");
      expect(Object.keys(data).sort()).toEqual(["prompt", "taskStatus", "variantId", "workflowId"]);
      expect(validateHistoryPatch({taskStatus:"DONE"})).toEqual({taskStatus:"DONE"});
      expect(() => validateHistorySave({prompt, workflowId, variantId, ownerId:"attacker"})).toThrow();
    }
    expect(() => validateHistoryPatch({taskStatus:"COMPLETED"})).toThrow();
    const output = publicHistoryRecord({
      id:"c12345678901234567890123", prompt:"Safe photo", workflowId:"WF-06", variantId:"image",
      taskStatus:"DONE", ownerId:"private_user", createdAt: new Date("2026-10-20T10:00:00Z"),
    });
    expect(output).not.toHaveProperty("ownerId");
    expect(output.workflowHref).toBe("/workflows/website-ready");
  });

  test("UI adds responsive guidance, status filtering, refresh and unambiguous manual statuses", () => {
    const ui = read("components/ai-workspace/AiWorkspaceUnderstanding.jsx");
    const history = read("components/ai-workspace/WorkspaceHistoryPanel.jsx");
    expect(ui).toContain("aria-describedby=\"workspace-prompt-hint\"");
    expect(ui).toContain("{prompt.length}/500 characters");
    expect(ui).toContain("sm:grid-cols-2");
    expect(ui).toContain("<WorkspacePlanReview key={");
    expect(history).toContain("Refresh history");
    expect(history).toContain("history-status-filter");
    expect(history).toContain("filter === \"ALL\"");
    expect(history).toContain("aria-busy={loading || busy}");
    expect(history).toContain("window.confirm");
    expect(history).toContain("setRecords(items => [data.record");
    expect(history).toContain("setRecords(items => items.map(");
    expect(history).toContain("setRecords(items => items.filter(");
    expect(history).not.toContain("runWorkspaceWebsiteReady");
    expect(history).not.toContain("/api/ai-workspace/planner");
  });

  test("history routes remain owner-scoped, origin checked and uncached", () => {
    const collection = read("app/api/ai-workspace/history/route.js");
    const item = read("app/api/ai-workspace/history/[id]/route.js");
    const helper = read("lib/ai-workspace/historyHttp.js");
    for (const route of [collection, item]) {
      expect(route).toContain("await auth()");
      expect(route).toContain("validHistoryOrigin(request)");
      expect(route).toContain("ownerId");
    }
    expect(collection).toContain("where: { ownerId }");
    expect(item).toContain("where: { id: guard.id, ownerId: guard.ownerId }");
    expect(helper).toContain('"Cache-Control": "private, no-store, max-age=0"');
    expect(helper).toContain("total > 3200");
  });

  test("paid planner and local processing remain explicitly gated, never triggered by history", () => {
    const route = read("app/api/ai-workspace/planner/route.js");
    const panel = read("components/ai-workspace/WorkspaceAiPlannerPanel.jsx");
    const reviewer = read("components/ai-workspace/WorkspacePlanReview.jsx");
    const run = read("components/ai-workspace/WorkspaceWebsiteRun.jsx");
    expect(route).toContain('process.env.AI_WORKSPACE_PLANNER_ENABLED === "true"');
    expect(route).toContain('process.env.AI_REAL_SPEND_APPROVED === "true"');
    expect(panel).toContain("!consent");
    expect(panel).toContain("Ask AI (may use credits)");
    expect(reviewer).toContain('<WorkspaceWebsiteRun plan={plan} />');
    expect(run).toContain("onClick={runLocal}");
    expect(run).toContain("URL.revokeObjectURL");
  });
});
