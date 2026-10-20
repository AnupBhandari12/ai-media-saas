"use client";
// Executes ONLY WF-03 photo branch using existing local crop, resize and compress functions.
import {cropImage} from "../tools/image/cropImage.js";
import {resizeImageByPixels} from "../tools/image/resizeImageByPixels.js";
import {compressImage} from "../tools/image/compressImage.js";
import {runApprovedLocalSteps} from "./runLocalWorkflow.js";
import {createFacebookFilename, getFacebookCrop, getFacebookReadyPlan,
  FACEBOOK_READY_LIMITS, validateFacebookFile, validateFacebookSource} from "./facebookReadyPlan.js";

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
}
async function readDimensions(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("The browser could not read this image."); }
  try { return {width: bitmap.width, height: bitmap.height}; }
  finally { bitmap.close(); }
}
function checkedBlob(output, expectedMime) {
  const blob = output?.blob;
  if (!(blob instanceof Blob) || blob.size < 1 ||
      blob.size > FACEBOOK_READY_LIMITS.maxOutputBytes || blob.type !== expectedMime) {
    throw new Error("An image step returned an unexpected or oversized output format.");
  }
  return blob;
}
function checkedDimensions(output, width, height, step) {
  if (output?.width !== width || output?.height !== height) {
    throw new Error(`${step} produced unexpected dimensions.`);
  }
}
export async function runFacebookReady(file, settings = {}, {onStep, signal, adapters} = {}) {
  validateFacebookFile(file);
  const plan = getFacebookReadyPlan(settings);
  checkAbort(signal);
  const api = adapters || {dimensions: readDimensions, crop: cropImage,
    resize: resizeImageByPixels, compress: compressImage};
  if (![api.dimensions, api.crop, api.resize, api.compress].every((fn) => typeof fn === "function")) {
    throw new Error("Facebook photo processors are unavailable.");
  }
  const decoded = await api.dimensions(file);
  const source = validateFacebookSource(decoded?.width, decoded?.height);
  checkAbort(signal);
  const crop = getFacebookCrop(source, {presetId: plan.config.presetId,
    horizontalPosition: plan.config.horizontalPosition,
    verticalPosition: plan.config.verticalPosition});
  const expectedMime = file.type;
  const operations = {
    "IMG-08": async (input) => {
      checkAbort(signal);
      const output = await api.crop(input, crop);
      checkedBlob(output, expectedMime);
      checkedDimensions(output, crop.width, crop.height, "Crop");
      return {file: new File([output.blob], input.name, {type: expectedMime}), status: "COMPLETED"};
    },
    "IMG-03": async (input) => {
      checkAbort(signal);
      const output = await api.resize(input, plan.config.width, plan.config.height);
      checkedBlob(output, expectedMime);
      checkedDimensions(output, plan.config.width, plan.config.height, "Resize");
      return {file: new File([output.blob], input.name, {type: expectedMime}), status: "COMPLETED"};
    },
    "IMG-01": async (input) => {
      checkAbort(signal);
      const output = await api.compress(input, plan.config.qualityPercent);
      checkedBlob(output, expectedMime);
      checkedDimensions(output, plan.config.width, plan.config.height, "Compression");
      return {file: new File([output.blob], input.name, {type: expectedMime}),
        status: output.reduced === false ? "SKIPPED" : "COMPLETED"};
    },
  };
  const processed = await runApprovedLocalSteps({steps: plan.steps, input: file, operations, onStep, signal});
  checkAbort(signal);
  checkedBlob({blob: processed.file}, expectedMime);
  return Object.freeze({
    blob: processed.file,
    filename: createFacebookFilename(file.name, plan.config.presetId, expectedMime),
    processingMode: "BROWSER_LOCAL",
    config: Object.freeze({presetId: plan.config.presetId, width: plan.config.width,
      height: plan.config.height, qualityPercent: plan.config.qualityPercent}),
    source: Object.freeze({...source, bytes: file.size, mimeType: expectedMime}),
    result: Object.freeze({width: plan.config.width, height: plan.config.height,
      bytes: processed.file.size, mimeType: expectedMime,
      publishComplianceVerified: false, cropRemovesEdges: crop.width < source.width || crop.height < source.height}),
    crop,
    trace: processed.trace,
  });
}
