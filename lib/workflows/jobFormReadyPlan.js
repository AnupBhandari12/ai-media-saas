// WF-08 photo branch: only the existing IMG-10 crop/photo maker then IMG-02 compressor.
import {getWorkflowById} from "./registry.js";

export const JOB_FORM_READY_STEPS = Object.freeze(["IMG-10", "IMG-02"]);
export const JOB_FORM_READY_LIMITS = Object.freeze({
  maxInputBytes: 10 * 1024 * 1024,
  maxSidePixels: 8000,
  maxInputPixels: 20_000_000,
  minOutputSide: 100,
  maxOutputSide: 1600,
  maxOutputPixels: 3_000_000,
});
export const JOB_FORM_PRESETS = Object.freeze({
  passport: Object.freeze({label: "35 × 45 mm approx.", width: 413, height: 531, note: "Approx. 300 DPI; not universal"}),
  square: Object.freeze({label: "2 × 2 in approx.", width: 600, height: 600, note: "Approx. 300 DPI; not universal"}),
  form: Object.freeze({label: "Online form portrait", width: 600, height: 800, note: "Example pixel preset"}),
  custom: Object.freeze({label: "Custom pixel dimensions", width: null, height: null, note: "Match your form instructions"}),
});
export const JOB_FORM_TARGETS_KB = Object.freeze([100, 200, 500, 1024]);
const MIME = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const SETTINGS = Object.freeze(["presetId", "width", "height", "targetKb", "zoom", "verticalPosition"]);

function validOutputDimensions(width, height) {
  return Number.isSafeInteger(width) && Number.isSafeInteger(height) &&
    width >= JOB_FORM_READY_LIMITS.minOutputSide && height >= JOB_FORM_READY_LIMITS.minOutputSide &&
    width <= JOB_FORM_READY_LIMITS.maxOutputSide && height <= JOB_FORM_READY_LIMITS.maxOutputSide &&
    width * height <= JOB_FORM_READY_LIMITS.maxOutputPixels;
}

export function normalizeJobFormSettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
    Object.keys(settings).some((key) => !SETTINGS.includes(key))) {
    throw new Error("Unsupported form-photo settings.");
  }
  const presetId = settings.presetId ?? "passport";
  if (typeof presetId !== "string" || !Object.hasOwn(JOB_FORM_PRESETS, presetId)) {
    throw new Error("Choose a supported photo size preset.");
  }
  const preset = JOB_FORM_PRESETS[presetId];
  if (presetId !== "custom" && (Object.hasOwn(settings, "width") || Object.hasOwn(settings, "height"))) {
    throw new Error("Custom width and height require the custom preset.");
  }
  const width = presetId === "custom" ? settings.width : preset.width;
  const height = presetId === "custom" ? settings.height : preset.height;
  if (!validOutputDimensions(width, height)) {
    throw new Error("Photo dimensions must be whole pixels from 100–1600, within 3 MP.");
  }
  const targetKb = settings.targetKb ?? 200;
  if (!JOB_FORM_TARGETS_KB.includes(targetKb)) {
    throw new Error("Choose an approved photo size goal in KB.");
  }
  const zoom = settings.zoom ?? 1;
  const verticalPosition = settings.verticalPosition ?? 50;
  if (typeof zoom !== "number" || !Number.isFinite(zoom) || zoom < 1 || zoom > 2 ||
      typeof verticalPosition !== "number" || !Number.isInteger(verticalPosition) ||
      verticalPosition < 0 || verticalPosition > 100) {
    throw new Error("Zoom must be 1–2 and vertical position 0–100.");
  }
  return Object.freeze({presetId, width, height, targetKb, zoom, verticalPosition, outputMimeType: "image/jpeg"});
}

export function validateJobFormFile(file) {
  if (!file || typeof file.name !== "string" || !file.name.trim() ||
      !Number.isSafeInteger(file.size) || file.size < 1 ||
      !MIME.includes(file.type)) {
    throw new Error("Choose a non-empty JPG, PNG or WebP photo.");
  }
  if (file.size > JOB_FORM_READY_LIMITS.maxInputBytes) {
    throw new Error("Photo must be 10 MB or smaller.");
  }
  return file;
}

export function validateJobFormInputDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || width > JOB_FORM_READY_LIMITS.maxSidePixels ||
      height > JOB_FORM_READY_LIMITS.maxSidePixels ||
      width * height > JOB_FORM_READY_LIMITS.maxInputPixels) {
    throw new Error("Input photo exceeds safe local pixel limits.");
  }
  return Object.freeze({width, height});
}

export function getJobFormReadyPlan(settings = {}) {
  const config = normalizeJobFormSettings(settings);
  const variant = getWorkflowById("WF-08")?.variants.find((v) => v.id === "photo");
  if (!variant || variant.steps.length !== JOB_FORM_READY_STEPS.length ||
      variant.steps.some((id, index) => id !== JOB_FORM_READY_STEPS[index])) {
    throw new Error("Job/Form photo registry changed; processing requires review.");
  }
  return Object.freeze({workflowId: "WF-08", variantId: "photo",
    processingMode: "BROWSER_LOCAL", steps: JOB_FORM_READY_STEPS, config});
}

export function createJobFormFilename(inputName, width, height) {
  if (!validOutputDimensions(width, height)) throw new Error("Invalid output dimensions.");
  const stem = String(inputName).replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-")
    .slice(0, 66).replace(/^-+|-+$/g, "") || "photo";
  return `${stem}-form-${width}x${height}.jpg`;
}
