"use client";
// Browser-only executor; invokes the existing IMG-02 target compressor, not an API/AI provider.
import { compressToTargetSize } from "../tools/image/compressToTargetSize.js";
import { runApprovedLocalSteps } from "./runLocalWorkflow.js";
import {createEmailReadyFilename, EMAIL_READY_LIMITS, getEmailReadyPlan,
  validateEmailReadyDimensions, validateEmailReadyFile} from "./emailReadyPlan.js";

const ALLOWED_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const checkAbort = (signal) => {
  if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
};

async function inspectDimensions(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("This browser could not decode the selected JPG, PNG or WebP image."); }
  try { return {width: bitmap.width, height: bitmap.height}; }
  finally { bitmap.close(); }
}

function compatibleOutputType(inputMime, outputMime) {
  // Existing IMG-02 converts PNG to WebP when compression is needed.
  return outputMime === inputMime || (inputMime === "image/png" && outputMime === "image/webp");
}

export async function runEmailReady(file, settings = {}, {onStep, signal, adapters} = {}) {
  validateEmailReadyFile(file);
  const plan = getEmailReadyPlan(settings);
  checkAbort(signal);
  const api = adapters || {dimensions: inspectDimensions, compress: compressToTargetSize};
  if (typeof api.dimensions !== "function" || typeof api.compress !== "function") {
    throw new Error("A required browser image processor is unavailable.");
  }
  const dimensions = await api.dimensions(file);
  const original = validateEmailReadyDimensions(dimensions?.width, dimensions?.height);
  checkAbort(signal);
  let outputDimensions = original;
  let outputType = file.type;
  const operations = {
    "IMG-02": async (input) => {
      const processed = await api.compress(input, plan.config.targetKb);
      const blob = processed?.blob;
      if (!(blob instanceof Blob) || !blob.size || !ALLOWED_TYPES.includes(blob.type) ||
          !compatibleOutputType(input.type, blob.type)) {
        throw new Error("Compression returned an unsupported or empty image format.");
      }
      const after = validateEmailReadyDimensions(processed.width, processed.height);
      if (after.width > original.width || after.height > original.height ||
          Math.abs(after.width / after.height - original.width / original.height) > 0.02) {
        throw new Error("Compression returned unexpected output dimensions.");
      }
      outputDimensions = after;
      outputType = blob.type;
      const next = new File([blob], input.name, {type: blob.type, lastModified: Date.now()});
      return {file: next, status: processed.originalAlreadyFits ? "SKIPPED" : "COMPLETED"};
    },
  };
  const executed = await runApprovedLocalSteps({steps: plan.steps, input: file,
    operations, onStep, signal});
  if (!executed.file.size || executed.file.size > EMAIL_READY_LIMITS.maxInputBytes ||
      executed.file.type !== outputType) {
    throw new Error("The prepared attachment is invalid or too large to download.");
  }
  const reachedTarget = executed.file.size <= plan.config.targetKb * 1024;
  return Object.freeze({
    blob: executed.file,
    filename: createEmailReadyFilename(file.name, outputType),
    processingMode: "BROWSER_LOCAL",
    source: Object.freeze({bytes: file.size, mimeType: file.type, ...original}),
    result: Object.freeze({bytes: executed.file.size, mimeType: outputType,
      width: outputDimensions.width, height: outputDimensions.height,
      targetKb: plan.config.targetKb, reachedTarget}),
    trace: executed.trace,
  });
}
