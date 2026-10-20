"use client";
// Browser-local WF-01 image only; composes existing IMG-05 then IMG-02 helpers.
import { convertImageFormat } from "../tools/image/convertImageFormat.js";
import { compressToTargetSize } from "../tools/image/compressToTargetSize.js";
import { runApprovedLocalSteps } from "./runLocalWorkflow.js";
import {createWhatsAppReadyFilename, getWhatsAppReadyPlan, validateWhatsAppReadyDimensions,
  validateWhatsAppReadyFile} from "./whatsAppReadyPlan.js";

async function inspectDimensions(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("The browser could not open this photo. Try a different JPG, PNG or WebP file."); }
  try { return {width: bitmap.width, height: bitmap.height}; }
  finally { bitmap.close(); }
}

function toJpegFile(original, blob) {
  if (!(blob instanceof Blob) || blob.size < 1 || blob.type !== "image/jpeg") {
    throw new Error("The processor did not create a valid JPG output.");
  }
  return new File([blob], original.name, {type: "image/jpeg", lastModified: Date.now()});
}

function checkCancelled(signal) {
  if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
}

export async function runWhatsAppReady(file, settings = {}, {onStep, signal, adapters} = {}) {
  validateWhatsAppReadyFile(file);
  const plan = getWhatsAppReadyPlan(settings);
  checkCancelled(signal);
  const api = adapters || {
    dimensions: inspectDimensions,
    convert: convertImageFormat,
    compress: compressToTargetSize,
  };
  // Validate decoded dimensions BEFORE drawing large canvases; never trust file extensions alone.
  const dimensions = await api.dimensions(file);
  const sourceDimensions = validateWhatsAppReadyDimensions(dimensions?.width, dimensions?.height);
  checkCancelled(signal);
  let outputWidth = sourceDimensions.width;
  let outputHeight = sourceDimensions.height;
  let reachedTarget = false;
  const operations = {
    "IMG-05": async (input) => {
      if (input.type === "image/jpeg") return {file: input, status: "SKIPPED"};
      const result = await api.convert(input, "image/jpeg", 90);
      return {file: toJpegFile(input, result.blob), status: "COMPLETED"};
    },
    "IMG-02": async (input) => {
      const result = await api.compress(input, plan.config.targetKb);
      const final = toJpegFile(input, result.blob);
      const dims = validateWhatsAppReadyDimensions(result.width, result.height);
      // Compress may reduce dimensions but must never upscale or change aspect ratio significantly.
      if (dims.width > sourceDimensions.width || dims.height > sourceDimensions.height ||
          Math.abs(dims.width / dims.height - sourceDimensions.width / sourceDimensions.height) > 0.02) {
        throw new Error("The compressor returned unexpected image dimensions.");
      }
      outputWidth = dims.width;
      outputHeight = dims.height;
      reachedTarget = final.size <= plan.config.targetKb * 1024;
      return {file: final, status: result.originalAlreadyFits ? "SKIPPED" : "COMPLETED"};
    },
  };
  const executed = await runApprovedLocalSteps({steps: plan.steps, input: file,
    operations, onStep, signal});
  if (executed.file.type !== "image/jpeg" || !executed.file.size ||
      executed.file.size > 10 * 1024 * 1024) {
    throw new Error("Unexpected output format or size. No download was created.");
  }
  return Object.freeze({
    blob: executed.file,
    filename: createWhatsAppReadyFilename(file.name),
    processingMode: "BROWSER_LOCAL",
    source: Object.freeze({bytes: file.size, ...sourceDimensions, mimeType: file.type}),
    result: Object.freeze({bytes: executed.file.size, width: outputWidth, height: outputHeight,
      mimeType: "image/jpeg", reachedTarget, targetKb: plan.config.targetKb}),
    trace: executed.trace,
  });
}
