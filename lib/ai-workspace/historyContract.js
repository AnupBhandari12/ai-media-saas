// Phase 23 / Stage 06: metadata-only plan/task history; never a workflow execution grant.
import { getWorkflowById } from "../workflows/registry.js";
import { validateWorkspacePlan } from "./planContract.js";

export const HISTORY_LIMIT = 30;
export const TASK_STATUSES = Object.freeze(["SAVED", "IN_PROGRESS", "DONE"]);

function plainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function exactKeys(value, keys) {
  return plainRecord(value) && Object.keys(value).length === keys.length &&
    keys.every(key => Object.hasOwn(value, key));
}

export function validateHistorySave(value) {
  // Do not accept client owner IDs, steps, task execution flags, provider data, files or URLs.
  if (!exactKeys(value, ["prompt", "workflowId", "variantId"]) ||
      typeof value.prompt !== "string" || value.prompt.length > 500 ||
      typeof value.workflowId !== "string" || typeof value.variantId !== "string") {
    throw new Error("Invalid history request.");
  }
  // Registry is authoritative. NEVER execute or trust model-selected steps/settings.
  const workflow = getWorkflowById(value.workflowId);
  const variant = workflow?.variants.find(item => item.id === value.variantId);
  if (!variant) throw new Error("Unknown workflow variant.");
  const preview = validateWorkspacePlan({
    workflowId: workflow.id, variantId: variant.id, steps: [...variant.steps],
  });
  return Object.freeze({
    prompt: value.prompt.trim(), workflowId: preview.workflowId, variantId: preview.variantId,
    taskStatus: "SAVED",
  });
}

export function validateHistoryPatch(value) {
  if (!exactKeys(value, ["taskStatus"]) || !TASK_STATUSES.includes(value.taskStatus)) {
    throw new Error("Invalid task status.");
  }
  return Object.freeze({ taskStatus: value.taskStatus });
}

export function validHistoryId(id) {
  return typeof id === "string" && /^c[a-z0-9]{20,32}$/.test(id);
}

export function publicHistoryRecord(item) {
  if (!item || typeof item !== "object") throw new Error("Invalid history record.");
  const workflow = getWorkflowById(item.workflowId);
  const variant = workflow?.variants.find(entry => entry.id === item.variantId);
  return Object.freeze({
    id: item.id,
    prompt: item.prompt,
    workflowId: item.workflowId,
    workflowName: workflow?.name ?? "Workflow unavailable",
    variantId: item.variantId,
    variantName: variant?.name ?? "Variant unavailable",
    // A renamed/deleted workflow becomes informational; no user-controlled URL is persisted.
    workflowHref: workflow && variant ? `/workflows/${workflow.slug}` : null,
    taskStatus: TASK_STATUSES.includes(item.taskStatus) ? item.taskStatus : "SAVED",
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : null,
  });
}
