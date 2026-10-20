// Phase 22 / Stage 03. Approved WF-01 image-only plan; no client-defined steps.
import { getWorkflowById } from "./registry.js";

export const WHATSAPP_READY_STEPS = Object.freeze(["IMG-05", "IMG-02"]);
export const WHATSAPP_READY_LIMITS = Object.freeze({
  maxInputBytes: 10 * 1024 * 1024,
  maxInputPixels: 20_000_000,
  maxSidePixels: 8000,
});
export const WHATSAPP_SIZE_PRESETS = Object.freeze({
  smaller: Object.freeze({label: "Smaller file", targetKb: 150}),
  balanced: Object.freeze({label: "Balanced", targetKb: 350}),
  clearer: Object.freeze({label: "Clearer photo", targetKb: 700}),
});
const SUPPORTED_INPUTS = Object.freeze(["image/jpeg", "image/png", "image/webp"]);

export function normalizeWhatsAppReadySettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
      Object.keys(settings).some((key) => key !== "sizePreset")) {
    throw new Error("Unsupported WhatsApp workflow settings.");
  }
  const sizePreset = settings.sizePreset ?? "balanced";
  if (typeof sizePreset !== "string" || !Object.hasOwn(WHATSAPP_SIZE_PRESETS, sizePreset)) {
    throw new Error("Choose a supported photo size preset.");
  }
  return Object.freeze({sizePreset, targetKb: WHATSAPP_SIZE_PRESETS[sizePreset].targetKb,
    outputMimeType: "image/jpeg"});
}

export function validateWhatsAppReadyFile(file) {
  if (!file || typeof file.name !== "string" || !Number.isSafeInteger(file.size) ||
      file.size < 1 || !SUPPORTED_INPUTS.includes(file.type)) {
    throw new Error("Choose a non-empty JPG, PNG or WebP photo.");
  }
  if (file.size > WHATSAPP_READY_LIMITS.maxInputBytes) {
    throw new Error("Choose a photo up to 10 MB.");
  }
  return file;
}

export function validateWhatsAppReadyDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || width > WHATSAPP_READY_LIMITS.maxSidePixels ||
      height > WHATSAPP_READY_LIMITS.maxSidePixels ||
      width * height > WHATSAPP_READY_LIMITS.maxInputPixels) {
    throw new Error("This photo is too large or has invalid dimensions for local processing.");
  }
  return Object.freeze({width, height});
}

export function getWhatsAppReadyPlan(settings = {}) {
  const config = normalizeWhatsAppReadySettings(settings);
  const workflow = getWorkflowById("WF-01");
  const variant = workflow?.variants.find((entry) => entry.id === "image");
  if (!variant || variant.steps.length !== WHATSAPP_READY_STEPS.length ||
      variant.steps.some((id, index) => id !== WHATSAPP_READY_STEPS[index])) {
    throw new Error("WhatsApp workflow registry changed. Execution is blocked until reviewed.");
  }
  return Object.freeze({workflowId: "WF-01", variantId: "image", processingMode: "BROWSER_LOCAL",
    config, steps: WHATSAPP_READY_STEPS});
}

export function createWhatsAppReadyFilename(name) {
  const stem = String(name).replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-").slice(0, 70).replace(/^-+|-+$/g, "") || "photo";
  return `${stem}-whatsapp-ready.jpg`;
}
