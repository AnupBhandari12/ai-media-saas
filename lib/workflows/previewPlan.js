// Read-only plan builder. Stage 01 deliberately has NO executor or network/AI dispatch.
import { getToolById, TOOL_STATUS } from "../tools/registry.js";
import { getWorkflowById } from "./registry.js";

const SAFE_ID = /^[A-Z]{2,3}-\d{2}$/;

export function createWorkflowPreview(workflowId, variantId) {
  const workflow = getWorkflowById(workflowId);
  if (!workflow) throw new Error("Unknown workflow ID");

  const variant = workflow.variants.find((entry) => entry.id === variantId);
  if (!variant) throw new Error("Unknown workflow variant");

  if (variant.steps.length < 1 || variant.steps.length > 8) {
    throw new Error("Workflow step count is invalid");
  }

  const steps = variant.steps.map((toolId, index) => {
    if (!SAFE_ID.test(toolId)) throw new Error("Invalid tool ID");
    const tool = getToolById(toolId);
    if (!tool) throw new Error("Unknown tool dependency");
    return Object.freeze({
      order: index + 1,
      toolId: tool.id,
      name: tool.name,
      route: tool.route,
      registeredToolAvailable: tool.status === TOOL_STATUS.AVAILABLE,
    });
  });

  return Object.freeze({
    workflowId: workflow.id,
    workflowName: workflow.name,
    variantId: variant.id,
    variantName: variant.name,
    // A step preview is not an execution permission or a promise of output compatibility.
    executable: false,
    needsCompatibilityReview: true,
    steps: Object.freeze(steps),
  });
}
