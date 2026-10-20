// Phase 22 / Stage 04. WF-07 photo attachment only; PDF remains a preview.
import { getWorkflowById } from "./registry.js";

export const EMAIL_READY_STEPS = Object.freeze(["IMG-02"]);
export const EMAIL_READY_LIMITS = Object.freeze({
  maxInputBytes: 10 * 1024 * 1024,
  maxInputPixels: 20_000_000,
  maxSidePixels: 8000,
});
export const EMAIL_SIZE_PRESETS = Object.freeze({
  small: Object.freeze({label: "Small attachment", targetKb: 200}),
  balanced: Object.freeze({label: "Balanced attachment", targetKb: 500}),
  detailed: Object.freeze({label: "More detail", targetKb: 1024}),
});
const MIME_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const EXTENSIONS = Object.freeze({
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
});

export function normalizeEmailReadySettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
      Object.keys(settings).some((key) => key !== "sizePreset")) {
    throw new Error("Unsupported email attachment settings.");
  }
  const sizePreset = settings.sizePreset ?? "balanced";
  if (typeof sizePreset !== "string" || !Object.hasOwn(EMAIL_SIZE_PRESETS, sizePreset)) {
    throw new Error("Choose one of the supported attachment size presets.");
  }
  return Object.freeze({sizePreset, targetKb: EMAIL_SIZE_PRESETS[sizePreset].targetKb});
}

export function validateEmailReadyFile(file) {
  if (!file || typeof file.name !== "string" || !Number.isSafeInteger(file.size) ||
      file.size < 1 || !MIME_TYPES.includes(file.type)) {
    throw new Error("Choose a non-empty JPG, PNG or WebP image attachment.");
  }
  if (file.size > EMAIL_READY_LIMITS.maxInputBytes) {
    throw new Error("Image attachments must be 10 MB or smaller.");
  }
  return file;
}

export function validateEmailReadyDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 ||
      width > EMAIL_READY_LIMITS.maxSidePixels || height > EMAIL_READY_LIMITS.maxSidePixels ||
      width * height > EMAIL_READY_LIMITS.maxInputPixels) {
    throw new Error("This image exceeds the safe local processing pixel limits.");
  }
  return Object.freeze({width, height});
}

export function getEmailReadyPlan(settings = {}) {
  const config = normalizeEmailReadySettings(settings);
  const variant = getWorkflowById("WF-07")?.variants.find((item) => item.id === "image");
  if (!variant || variant.steps.length !== EMAIL_READY_STEPS.length ||
      variant.steps.some((id, index) => id !== EMAIL_READY_STEPS[index])) {
    throw new Error("Email image workflow registry changed. Execution is blocked until reviewed.");
  }
  return Object.freeze({workflowId: "WF-07", variantId: "image", processingMode: "BROWSER_LOCAL",
    steps: EMAIL_READY_STEPS, config});
}

export function createEmailReadyFilename(inputName, outputMimeType) {
  const ext = EXTENSIONS[outputMimeType];
  if (!ext) throw new Error("Unsupported output image format.");
  const stem = String(inputName).replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-").slice(0, 70).replace(/^-+|-+$/g, "") || "image";
  return `${stem}-email-ready.${ext}`;
}
