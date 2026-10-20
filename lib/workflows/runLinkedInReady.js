"use client";
// WF-04 post ONLY: IMG-03 resize, IMG-05 convert, IMG-01 compress. No profile or paid processing.
import {resizeImageByPixels} from "../tools/image/resizeImageByPixels.js";
import {convertImageFormat} from "../tools/image/convertImageFormat.js";
import {compressImage} from "../tools/image/compressImage.js";
import {runApprovedLocalSteps} from "./runLocalWorkflow.js";
import {calculateLinkedInSize, createLinkedInFilename, getLinkedInReadyPlan,
  LINKEDIN_LIMITS, validateLinkedInFile, validateLinkedInSource} from "./linkedInReadyPlan.js";

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
}
async function readDimensions(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Browser could not decode this image."); }
  try { return {width: bitmap.width, height: bitmap.height}; }
  finally { bitmap.close(); }
}
function checkBlob(blob, type) {
  if (!(blob instanceof Blob) || blob.size < 1 ||
      blob.size > LINKEDIN_LIMITS.maxOutputBytes || blob.type !== type) {
    throw new Error("Processor returned an unsupported or oversized image format.");
  }
  return blob;
}
function checkSize(output, size, label) {
  if (output?.width !== size.width || output?.height !== size.height) {
    throw new Error(`${label} returned unexpected pixel dimensions.`);
  }
}

export async function runLinkedInReady(file, settings = {}, {onStep, signal, adapters} = {}) {
  validateLinkedInFile(file);
  const plan = getLinkedInReadyPlan(settings);
  checkAbort(signal);
  const api = adapters || {dimensions: readDimensions, resize: resizeImageByPixels,
    convert: convertImageFormat, compress: compressImage};
  if (![api.dimensions, api.resize, api.convert, api.compress].every((fn) => typeof fn === "function")) {
    throw new Error("Required browser image processors are unavailable.");
  }
  const sourceRaw = await api.dimensions(file);
  const source = validateLinkedInSource(sourceRaw?.width, sourceRaw?.height);
  checkAbort(signal);
  const size = calculateLinkedInSize(source, {presetId: plan.config.presetId});
  const operations = {
    "IMG-03": async (input) => {
      checkAbort(signal);
      if (source.width === size.width && source.height === size.height) {
        return {file: input, status: "SKIPPED"};
      }
      const outcome = await api.resize(input, size.width, size.height);
      checkBlob(outcome?.blob, input.type);
      checkSize(outcome, size, "Resize");
      return {file: new File([outcome.blob], input.name, {type: input.type}), status: "COMPLETED"};
    },
    "IMG-05": async (input) => {
      checkAbort(signal);
      if (input.type === "image/jpeg") return {file: input, status: "SKIPPED"};
      const outcome = await api.convert(input, "image/jpeg", 90);
      checkBlob(outcome?.blob, "image/jpeg");
      checkSize(outcome, size, "Conversion");
      return {file: new File([outcome.blob], input.name, {type: "image/jpeg"}), status: "COMPLETED"};
    },
    "IMG-01": async (input) => {
      checkAbort(signal);
      if (input.type !== "image/jpeg") throw new Error("JPG conversion is required before compression.");
      const outcome = await api.compress(input, plan.config.qualityPercent);
      checkBlob(outcome?.blob, "image/jpeg");
      checkSize(outcome, size, "Compression");
      return {file: new File([outcome.blob], input.name, {type: "image/jpeg"}),
        status: outcome.reduced === false ? "SKIPPED" : "COMPLETED"};
    },
  };
  const result = await runApprovedLocalSteps({steps: plan.steps, input: file,
    operations, onStep, signal});
  checkAbort(signal);
  checkBlob(result.file, "image/jpeg");
  return Object.freeze({
    blob: result.file,
    filename: createLinkedInFilename(file.name, plan.config.presetId),
    processingMode: "BROWSER_LOCAL",
    source: Object.freeze({...source, bytes: file.size, mimeType: file.type}),
    result: Object.freeze({...size, bytes: result.file.size, mimeType: "image/jpeg",
      profileVariantEnabled: false, postAcceptanceVerified: false, noUpscaling: true,
      noCrop: true}),
    config: Object.freeze({presetId: plan.config.presetId, qualityPercent: plan.config.qualityPercent}),
    trace: result.trace,
  });
}
