import { describe, expect, test } from "bun:test";
import { getToolById } from "../../lib/tools/registry.js";
import { workflows, getWorkflowById, getWorkflowBySlug, WORKFLOW_STATUS } from "../../lib/workflows/registry.js";
import { createWorkflowPreview } from "../../lib/workflows/previewPlan.js";

describe("Phase 22 Stage 01 • safe workflow previews", () => {
  test("ten catalog entries exist, with unique workflow IDs and slugs", () => {
    expect(workflows).toHaveLength(10);
    expect(new Set(workflows.map((w) => w.id)).size).toBe(10);
    expect(new Set(workflows.map((w) => w.slug)).size).toBe(10);
  });

  test("matches PDF phase 22 starting priorities", () => {
    for (const id of ["WF-06", "WF-01", "WF-07", "WF-08"]) {
      expect(getWorkflowById(id)?.priority).toBe("P1");
    }
    expect(getWorkflowBySlug("website-ready")?.id).toBe("WF-06");
  });

  test("each workflow remains preview-only and every dependency is in existing tool registry", () => {
    for (const wf of workflows) {
      expect(wf.status).toBe(WORKFLOW_STATUS.PLANNED);
      expect(wf.variants.length).toBeGreaterThan(0);
      for (const variant of wf.variants) {
        expect(new Set(variant.steps).size).toBe(variant.steps.length);
        const preview = createWorkflowPreview(wf.id, variant.id);
        expect(preview.executable).toBe(false);
        expect(preview.needsCompatibilityReview).toBe(true);
        expect(preview.steps).toHaveLength(variant.steps.length);
        for (const step of preview.steps) {
          const tool = getToolById(step.toolId);
          expect(tool?.name).toBe(step.name);
          expect(step.route).toBe(tool.route);
          expect(step.route.startsWith("/tools/")).toBe(true);
        }
      }
    }
  });

  test("rejects unknown workflow or unapproved variant", () => {
    expect(() => createWorkflowPreview("WF-99", "image")).toThrow();
    expect(() => createWorkflowPreview("WF-06", "execute-shell")).toThrow();
  });

  test("website plan uses existing image tools without executing them", () => {
    const preview = createWorkflowPreview("WF-06", "image");
    expect(preview.steps.map((item) => item.toolId)).toEqual(["IMG-03", "IMG-05", "IMG-14", "IMG-02"]);
    expect(preview.executable).toBe(false);
  });
});
