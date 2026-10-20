// Phase 23 / Stage 03: revalidate preview data before human review.
// Client-side acknowledgement is UX ONLY: it never authorizes processing.
import { validateWorkspacePlan } from "./planContract.js";

const PREVIEW_KEYS = Object.freeze([
  "status", "source", "workflowId", "workflowName", "workflowSlug",
  "variantId", "variantName", "steps", "requiresConfirmation", "executable", "costUsd",
]);
const STEP_KEYS = Object.freeze(["order", "toolId", "name", "route"]);

function plainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value, allowed) {
  return plainRecord(value) && Object.keys(value).length === allowed.length &&
    allowed.every((key) => Object.hasOwn(value, key));
}

// A plan may originate from a future model; do not trust copied names/steps/URLs.
export function createWorkspaceReview(plan) {
  if (!exactKeys(plan, PREVIEW_KEYS) || plan.status !== "PREVIEW_ONLY" ||
      !["CANONICAL_EXAMPLE", "DETERMINISTIC_INTENT"].includes(plan.source) ||
      plan.requiresConfirmation !== true || plan.executable !== false || plan.costUsd !== 0 ||
      !Array.isArray(plan.steps) || plan.steps.some((step) => !exactKeys(step, STEP_KEYS))) {
    throw new Error("Unsafe workspace preview. Create a new plan.");
  }

  // Canonical registry is the source of truth, not user/model-supplied steps.
  const verified = validateWorkspacePlan({
    workflowId: plan.workflowId,
    variantId: plan.variantId,
    steps: plan.steps.map((step) => step.toolId),
  });
  if (plan.workflowName !== verified.workflowName ||
      plan.workflowSlug !== verified.workflowSlug ||
      plan.variantName !== verified.variantName ||
      plan.steps.some((step, i) => step.order !== verified.steps[i].order ||
        step.name !== verified.steps[i].name || step.route !== verified.steps[i].route)) {
    throw new Error("Workspace preview does not match the registered workflow.");
  }

  return Object.freeze({
    status: "REVIEW_REQUIRED",
    workflowId: verified.workflowId,
    workflowName: verified.workflowName,
    variantName: verified.variantName,
    workflowHref: `/workflows/${verified.workflowSlug}`,
    steps: Object.freeze(verified.steps.map((step) => Object.freeze({ ...step }))),
    noExecution: true,
    previewChargeUsd: 0,
  });
}

// Pure UI receipt, NOT a token, capability, job, authorization, or quota grant.
export function acknowledgeWorkspacePlan(plan, checked) {
  const review = createWorkspaceReview(plan); // Always revalidate at transition.
  if (checked !== true) {
    return Object.freeze({ kind: "CONFIRMATION_REQUIRED", executable: false });
  }
  return Object.freeze({
    kind: "ACKNOWLEDGED_FOR_NAVIGATION",
    workflowHref: review.workflowHref,
    executable: false,
    noExecution: true,
  });
}
