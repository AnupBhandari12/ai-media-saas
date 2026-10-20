// Stage 01 is PLAN-ONLY: no API requests, file access, job execution, provider dispatch,
// quota modification, or runtime invocation of tools occurs in this module.
import { getToolById, TOOL_STATUS } from "../tools/registry.js";
import { getWorkflowById } from "../workflows/registry.js";
import { CANONICAL_PROMPTS, normalizeCanonicalPrompt } from "./canonicalPrompts.js";

const allowedVariants = new Set(
  CANONICAL_PROMPTS.map(({ workflowId, variantId }) => `${workflowId}:${variantId}`),
);

function isPlainRecord(value) {
  return value !== null && typeof value === "object" &&
    !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function hasExactKeys(candidate, keys) {
  return Object.keys(candidate).length === keys.length &&
    keys.every((key) => Object.hasOwn(candidate, key));
}

export function validateWorkspacePlan(candidate) {
  // Strict boundary for future LLM output. Reject added commands/settings/provider arguments.
  if (!isPlainRecord(candidate) || !hasExactKeys(candidate, ["workflowId", "variantId", "steps"])) {
    throw new Error("Plan must contain only workflowId, variantId and steps.");
  }
  const { workflowId, variantId, steps } = candidate;
  if (typeof workflowId !== "string" || typeof variantId !== "string" ||
      !allowedVariants.has(`${workflowId}:${variantId}`)) {
    throw new Error("This workflow variant is not approved for the AI Workspace preview.");
  }
  const workflow = getWorkflowById(workflowId);
  const variant = workflow?.variants.find((entry) => entry.id === variantId);
  if (!variant || !Array.isArray(steps) || steps.length < 1 || steps.length > 8 ||
      !steps.every((toolId, index) => typeof toolId === "string" && toolId === variant.steps[index]) ||
      steps.length !== variant.steps.length) {
    throw new Error("The steps must match the exact registered workflow variant.");
  }
  const verified = steps.map((toolId, index) => {
    const tool = getToolById(toolId);
    if (!tool || tool.status !== TOOL_STATUS.AVAILABLE || !tool.route?.startsWith("/tools/")) {
      throw new Error("A required tool is not available in the registry.");
    }
    return Object.freeze({ order: index + 1, toolId: tool.id, name: tool.name, route: tool.route });
  });
  return Object.freeze({
    status: "PREVIEW_ONLY",
    source: "CANONICAL_EXAMPLE",
    workflowId,
    workflowName: workflow.name,
    workflowSlug: workflow.slug,
    variantId,
    variantName: variant.name,
    steps: Object.freeze(verified),
    requiresConfirmation: true,
    executable: false,
    costUsd: 0,
  });
}

export function createWorkspacePlanFromPrompt(prompt) {
  // Never guess from unknown/ambiguous language or execute free-form instructions.
  if (typeof prompt !== "string" || prompt.length > 500 || !prompt.trim()) {
    return Object.freeze({
      kind: "NEEDS_CLARIFICATION",
      question: "Which media output do you want to prepare? Choose one of the examples below.",
    });
  }
  const normalized = normalizeCanonicalPrompt(prompt);
  const match = CANONICAL_PROMPTS.find((item) => normalizeCanonicalPrompt(item.prompt) === normalized);
  if (!match) {
    return Object.freeze({
      kind: "NEEDS_CLARIFICATION",
      question: "Which media output do you want to prepare? Choose one of the examples below.",
    });
  }
  const registered = getWorkflowById(match.workflowId);
  const variant = registered?.variants.find((item) => item.id === match.variantId);
  if (!variant) throw new Error("Canonical workflow is missing from registry.");
  const plan = validateWorkspacePlan({
    workflowId: match.workflowId,
    variantId: match.variantId,
    steps: [...variant.steps],
  });
  return Object.freeze({ kind: "PLAN", plan });
}
