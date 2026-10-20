// Phase 23 Stage 04: browser-local Website Ready execution bridge, not a model executor.
// The user explicitly approves a reviewed plan AND clicks Run after selecting a file.
// All other approved variants are handed to their existing guarded workflow pages.
import { createWorkspaceReview } from "./reviewGate.js";
import { getWebsiteReadyPlan, validateWebsiteReadyFile } from "../workflows/websiteReadyPlan.js";

const DEFAULT_SETTINGS = Object.freeze({ longSide: 1600, targetKb: 400, outputMimeType: "image/webp" });
const WEBSITE_WORKFLOW = "WF-06";
const WEBSITE_VARIANT = "image";

export function createWorkspaceLocalRunOffer(plan, acknowledged) {
  const review = createWorkspaceReview(plan); // Rejects spoofed IDs, steps, routes, status, and metadata.
  if (acknowledged !== true) {
    return Object.freeze({ kind: "REVIEW_REQUIRED", canRun: false });
  }
  if (plan.workflowId !== WEBSITE_WORKFLOW || plan.variantId !== WEBSITE_VARIANT) {
    // Do not pretend the other nine variant runners are available inside this Workspace.
    return Object.freeze({ kind: "OPEN_EXISTING_WORKFLOW", canRun: false, href: review.workflowHref });
  }
  const verified = getWebsiteReadyPlan(DEFAULT_SETTINGS); // Rechecks the Phase 22 registered steps.
  if (verified.workflowId !== review.workflowId || verified.variantId !== plan.variantId ||
      review.steps.length !== verified.steps.length ||
      review.steps.some((step, index) => step.toolId !== verified.steps[index])) {
    throw new Error("Workspace and local processor plans do not match.");
  }
  return Object.freeze({
    kind: "BROWSER_LOCAL_WEBSITE_READY",
    canRun: true,
    workflowId: verified.workflowId,
    variantId: verified.variantId,
    settings: DEFAULT_SETTINGS,
    acceptedTypes: Object.freeze(["image/jpeg", "image/png", "image/webp"]),
    maxInputBytes: 10 * 1024 * 1024,
    steps: verified.steps,
    processingMode: "BROWSER_LOCAL",
    providerCostUsd: 0,
  });
}

// The runner remains the Phase 22 single source of truth; no arbitrary operation map is accepted.
// `runner` is a test seam, never populated by text prompts, URLs or external responses.
export async function runWorkspaceWebsiteReady(plan, acknowledged, file, options = {}) {
  const offer = createWorkspaceLocalRunOffer(plan, acknowledged);
  if (offer.kind !== "BROWSER_LOCAL_WEBSITE_READY") {
    throw new Error("Website Ready is not approved for this Workspace local run.");
  }
  validateWebsiteReadyFile(file); // Independently validates type and byte limits.
  if (options.signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
  const runner = options.runner ?? (await import("../workflows/runWebsiteReady.js")).runWebsiteReady;
  if (typeof runner !== "function") throw new Error("Verified Website Ready runner is not available.");
  const result = await runner(file, offer.settings, {
    signal: options.signal,
    onStep: options.onStep,
  });
  if (options.signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
  if (!result || result.processingMode !== "BROWSER_LOCAL" ||
      !(result.blob instanceof Blob) || result.blob.size < 1 ||
      result.blob.type !== offer.settings.outputMimeType ||
      result.blob.size > offer.maxInputBytes ||
      typeof result.filename !== "string" || !/^[a-zA-Z0-9_-]+-website-ready\.webp$/.test(result.filename) ||
      !Array.isArray(result.trace) || result.trace.length !== offer.steps.length ||
      result.trace.some((trace, index) =>
        trace?.id !== offer.steps[index] ||
        !["COMPLETED", "SKIPPED"].includes(trace.status))) {
    throw new Error("The Website Ready runner returned an invalid result; no download was created.");
  }
  return result;
}
