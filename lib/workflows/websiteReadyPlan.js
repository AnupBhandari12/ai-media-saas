// Phase 22 / Stage 02: one approved local plan; never execute client-provided tool IDs.
import { getWorkflowById } from "./registry.js";

export const WEBSITE_READY_STEPS = Object.freeze([
  "IMG-03", "IMG-05", "IMG-14", "IMG-02",
]);

export const WEBSITE_READY_LIMITS = Object.freeze({
  maxInputBytes: 10 * 1024 * 1024,
  maxInputPixels: 20_000_000,
  minLongSide: 320,
  maxLongSide: 2400,
  minTargetKb: 30,
  maxTargetKb: 2048,
});

const INPUT_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const OUTPUT_TYPES = Object.freeze(["image/webp", "image/jpeg"]);

export function normalizeWebsiteReadySettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Invalid workflow settings.");
  }
  if (Object.keys(settings).some((key) => !["longSide", "targetKb", "outputMimeType"].includes(key))) {
    throw new Error("Unsupported workflow setting.");
  }
  const longSide = settings.longSide ?? 1600;
  const targetKb = settings.targetKb ?? 400;
  const outputMimeType = settings.outputMimeType ?? "image/webp";
  if (!Number.isInteger(longSide) || longSide < WEBSITE_READY_LIMITS.minLongSide || longSide > WEBSITE_READY_LIMITS.maxLongSide) {
    throw new Error("Maximum dimension must be 320–2400 pixels.");
  }
  if (!Number.isInteger(targetKb) || targetKb < WEBSITE_READY_LIMITS.minTargetKb || targetKb > WEBSITE_READY_LIMITS.maxTargetKb) {
    throw new Error("Target size must be 30–2048 KB.");
  }
  if (!OUTPUT_TYPES.includes(outputMimeType)) {
    throw new Error("Choose JPG or WebP output.");
  }
  return Object.freeze({longSide, targetKb, outputMimeType});
}

export function validateWebsiteReadyFile(file) {
  if (!file || typeof file.name !== "string" ||
      !Number.isSafeInteger(file.size) || file.size < 1 ||
      !INPUT_TYPES.includes(file.type)) {
    throw new Error("Select a non-empty JPG, PNG or WebP image.");
  }
  if (file.size > WEBSITE_READY_LIMITS.maxInputBytes) {
    throw new Error("Choose an image up to 10 MB.");
  }
  return file;
}

export function getWebsiteReadyPlan(settings) {
  const config = normalizeWebsiteReadySettings(settings);
  const workflow = getWorkflowById("WF-06");
  const variant = workflow?.variants.find((entry) => entry.id === "image");
  if (!variant || variant.steps.length !== WEBSITE_READY_STEPS.length ||
      variant.steps.some((id, index) => id !== WEBSITE_READY_STEPS[index])) {
    throw new Error("Website workflow registry changed; execution is blocked until reviewed.");
  }
  return Object.freeze({
    workflowId: "WF-06",
    variantId: "image",
    processingMode: "BROWSER_LOCAL",
    config,
    steps: WEBSITE_READY_STEPS,
  });
}

export function computeResizedDimensions(width, height, longSide) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width * height > WEBSITE_READY_LIMITS.maxInputPixels) {
    throw new Error("Image dimensions are invalid or too large for local processing.");
  }
  const scale = Math.min(1, longSide / Math.max(width, height));
  return Object.freeze({width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)), skipped: scale === 1});
}

export function createWebsiteReadyFilename(name, mimeType) {
  const stem = String(name).replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 70) || "image";
  const extension = mimeType === "image/jpeg" ? "jpg" : "webp";
  return `${stem}-website-ready.${extension}`;
}
