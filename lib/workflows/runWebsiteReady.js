"use client";
// Executes approved existing image functions on the user's device; never posts a file.
import { resizeImageByPixels } from "../tools/image/resizeImageByPixels.js";
import { convertImageFormat } from "../tools/image/convertImageFormat.js";
import { removeImageMetadata } from "../tools/image/removeImageMetadata.js";
import { compressToTargetSize } from "../tools/image/compressToTargetSize.js";
import { runApprovedLocalSteps } from "./runLocalWorkflow.js";
import { computeResizedDimensions, createWebsiteReadyFilename,
  getWebsiteReadyPlan, validateWebsiteReadyFile, WEBSITE_READY_LIMITS } from "./websiteReadyPlan.js";

async function readLocalImageDimensions(file) {
  const bitmap = await createImageBitmap(file);
  try { return {width: bitmap.width, height: bitmap.height}; }
  finally { bitmap.close(); }
}

function nextFile(original, blob) {
  if (!(blob instanceof Blob) || blob.size < 1) throw new Error("The processor created an empty output.");
  const type = blob.type;
  if (!["image/jpeg", "image/png", "image/webp"].includes(type)) {
    throw new Error("The processor returned an unexpected image format.");
  }
  return new File([blob], original.name, {type, lastModified: Date.now()});
}

export async function runWebsiteReady(file, settings = {}, {onStep, signal, adapters} = {}) {
  validateWebsiteReadyFile(file);
  const plan = getWebsiteReadyPlan(settings);
  const api = adapters || {
    dimensions: readLocalImageDimensions,
    resize: resizeImageByPixels,
    convert: convertImageFormat,
    removeMetadata: removeImageMetadata,
    compress: compressToTargetSize,
  };
  const size = await api.dimensions(file);
  const resized = computeResizedDimensions(size.width, size.height, plan.config.longSide);
  const source = {bytes: file.size, width: size.width, height: size.height};
  let currentWidth = size.width;
  let currentHeight = size.height;
  let targetReached = false;
  let finalMimeType = plan.config.outputMimeType;
  const operations = {
    "IMG-03": async (input) => {
      if (resized.skipped) return {file: input, status: "SKIPPED"};
      const result = await api.resize(input, resized.width, resized.height);
      currentWidth = result.width;
      currentHeight = result.height;
      return {file: nextFile(input, result.blob), status: "COMPLETED"};
    },
    "IMG-05": async (input) => {
      if (input.type === plan.config.outputMimeType) return {file: input, status: "SKIPPED"};
      const result = await api.convert(input, plan.config.outputMimeType, 90);
      finalMimeType = result.blob.type;
      return {file: nextFile(input, result.blob), status: "COMPLETED"};
    },
    "IMG-14": async (input) => {
      const result = await api.removeMetadata(input);
      return {file: nextFile(input, result.blob), status: "COMPLETED"};
    },
    "IMG-02": async (input) => {
      const result = await api.compress(input, plan.config.targetKb);
      currentWidth = result.width;
      currentHeight = result.height;
      targetReached = result.reachedTarget;
      finalMimeType = result.blob.type;
      return {file: nextFile(input, result.blob), status: result.originalAlreadyFits ? "SKIPPED" : "COMPLETED"};
    },
  };
  const executed = await runApprovedLocalSteps({steps: plan.steps, input: file, operations, onStep, signal});
  if (executed.file.size > WEBSITE_READY_LIMITS.maxInputBytes || finalMimeType !== plan.config.outputMimeType) {
    throw new Error("Unexpected output format or size; no download was created.");
  }
  return Object.freeze({
    blob: executed.file,
    filename: createWebsiteReadyFilename(file.name, finalMimeType),
    source,
    result: Object.freeze({bytes: executed.file.size, width: currentWidth, height: currentHeight, mimeType: finalMimeType, targetReached}),
    trace: executed.trace,
    processingMode: "BROWSER_LOCAL",
  });
}
