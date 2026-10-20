"use client";
// Runs reviewed WF-08 photo steps locally. Does not decide official photo eligibility.
import {createPassportPhoto} from "../tools/image/createPassportPhoto.js";
import {compressToTargetSize} from "../tools/image/compressToTargetSize.js";
import {runApprovedLocalSteps} from "./runLocalWorkflow.js";
import {createJobFormFilename, getJobFormReadyPlan, JOB_FORM_READY_LIMITS,
  validateJobFormFile, validateJobFormInputDimensions} from "./jobFormReadyPlan.js";

function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException("Workflow cancelled.", "AbortError");
}
async function inspectDimensions(file) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("Browser could not decode this photo."); }
  try { return {width: bitmap.width, height: bitmap.height}; }
  finally { bitmap.close(); }
}
function checkBlob(blob) {
  if (!(blob instanceof Blob) || !blob.size || blob.size > JOB_FORM_READY_LIMITS.maxInputBytes ||
      blob.type !== "image/jpeg") {
    throw new Error("Photo processing returned an unsupported or oversized JPG.");
  }
}
function exactDimensions(actual, required, phase) {
  if (!actual || actual.width !== required.width || actual.height !== required.height) {
    throw new Error(`${phase} changed the required form photo dimensions. Try a larger KB goal or different photo.`);
  }
}

export async function runJobFormReady(file, settings = {}, {onStep, signal, adapters} = {}) {
  validateJobFormFile(file);
  const plan = getJobFormReadyPlan(settings);
  checkAbort(signal);
  const api = adapters || {dimensions: inspectDimensions,
    passport: createPassportPhoto, compress: compressToTargetSize};
  if (typeof api.dimensions !== "function" || typeof api.passport !== "function" ||
      typeof api.compress !== "function") {
    throw new Error("Required local photo processors are unavailable.");
  }
  const dimensions = await api.dimensions(file);
  const sourceDimensions = validateJobFormInputDimensions(dimensions?.width, dimensions?.height);
  checkAbort(signal);
  const config = plan.config;
  const required = {width: config.width, height: config.height};
  const operations = {
    "IMG-10": async (input) => {
      const output = await api.passport(input, {
        width: config.width, height: config.height, zoom: config.zoom,
        verticalPosition: config.verticalPosition, outputMimeType: "image/jpeg",
      });
      checkBlob(output?.blob);
      exactDimensions(output, required, "ID photo maker");
      return {file: new File([output.blob], input.name, {type: "image/jpeg"}), status: "COMPLETED"};
    },
    "IMG-02": async (input) => {
      const output = await api.compress(input, config.targetKb);
      checkBlob(output?.blob);
      // IMG-02 can downscale to hit very small KB goals. Fail closed for exact forms.
      exactDimensions(output, required, "Compression");
      return {file: new File([output.blob], input.name, {type: "image/jpeg"}),
        status: output.originalAlreadyFits ? "SKIPPED" : "COMPLETED"};
    },
  };
  const executed = await runApprovedLocalSteps({steps: plan.steps, input: file,
    operations, onStep, signal});
  checkBlob(executed.file);
  const reachedTarget = executed.file.size <= config.targetKb * 1024;
  return Object.freeze({
    blob: executed.file,
    filename: createJobFormFilename(file.name, config.width, config.height),
    processingMode: "BROWSER_LOCAL", plan: Object.freeze({width: config.width,
      height: config.height, targetKb: config.targetKb, presetId: config.presetId}),
    source: Object.freeze({bytes: file.size, mimeType: file.type, ...sourceDimensions}),
    result: Object.freeze({bytes: executed.file.size, mimeType: "image/jpeg",
      width: config.width, height: config.height, targetKb: config.targetKb,
      reachedTarget, formComplianceVerified: false}),
    trace: executed.trace,
  });
}
