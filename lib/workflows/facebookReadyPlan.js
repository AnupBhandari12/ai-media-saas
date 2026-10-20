// WF-03 Facebook photo beta. Presets are examples, not a Facebook acceptance guarantee.
import {getWorkflowById} from "./registry.js";

export const FACEBOOK_READY_STEPS = Object.freeze(["IMG-08", "IMG-03", "IMG-01"]);
export const FACEBOOK_PRESETS = Object.freeze({
  square: Object.freeze({label: "Square feed image", width: 1080, height: 1080}),
  landscape: Object.freeze({label: "Landscape feed image", width: 1200, height: 630}),
  cover: Object.freeze({label: "Page cover draft", width: 1640, height: 624}),
});
export const FACEBOOK_READY_LIMITS = Object.freeze({
  maxFileBytes: 10 * 1024 * 1024,
  maxDimension: 8000,
  maxInputPixels: 20_000_000,
  maxOutputBytes: 20 * 1024 * 1024,
});
const VALID_MIME = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const SETTINGS = Object.freeze(["presetId", "horizontalPosition", "verticalPosition", "qualityPercent"]);

export function normalizeFacebookSettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
      Object.keys(settings).some((key) => !SETTINGS.includes(key))) {
    throw new Error("Unsupported Facebook settings.");
  }
  const presetId = settings.presetId ?? "square";
  if (typeof presetId !== "string" || !Object.hasOwn(FACEBOOK_PRESETS, presetId)) {
    throw new Error("Choose a supported Facebook image preset.");
  }
  const horizontalPosition = settings.horizontalPosition ?? 50;
  const verticalPosition = settings.verticalPosition ?? 50;
  const qualityPercent = settings.qualityPercent ?? 80;
  if (![horizontalPosition, verticalPosition].every((n) => Number.isInteger(n) && n >= 0 && n <= 100) ||
      ![70, 80, 90].includes(qualityPercent)) {
    throw new Error("Position must be 0–100 and compression preset must be 70, 80 or 90.");
  }
  return Object.freeze({presetId, horizontalPosition, verticalPosition, qualityPercent,
    ...FACEBOOK_PRESETS[presetId]});
}

export function validateFacebookFile(file) {
  if (!file || typeof file.name !== "string" || !file.name.trim() ||
      !Number.isSafeInteger(file.size) || file.size < 1 ||
      file.size > FACEBOOK_READY_LIMITS.maxFileBytes || !VALID_MIME.includes(file.type)) {
    throw new Error("Choose a non-empty JPG, PNG or WebP photo up to 10 MB.");
  }
  return file;
}

export function validateFacebookSource(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 ||
      width > FACEBOOK_READY_LIMITS.maxDimension ||
      height > FACEBOOK_READY_LIMITS.maxDimension ||
      width * height > FACEBOOK_READY_LIMITS.maxInputPixels) {
    throw new Error("Input image exceeds safe browser processing dimensions.");
  }
  return Object.freeze({width, height});
}

export function getFacebookCrop(source, settings = {}) {
  const dims = validateFacebookSource(source?.width, source?.height);
  const config = normalizeFacebookSettings(settings);
  const {width, height} = dims;
  const targetRatio = config.width / config.height;
  let cropWidth;
  let cropHeight;
  if (width / height > targetRatio) {
    cropHeight = height;
    cropWidth = Math.floor(height * targetRatio);
  } else {
    cropWidth = width;
    cropHeight = Math.floor(width / targetRatio);
  }
  if (cropWidth < config.width || cropHeight < config.height) {
    throw new Error("Photo is too small for this preset without upscaling. Use a larger source image.");
  }
  const x = Math.round((width - cropWidth) * config.horizontalPosition / 100);
  const y = Math.round((height - cropHeight) * config.verticalPosition / 100);
  return Object.freeze({x, y, width: cropWidth, height: cropHeight});
}

export function getFacebookReadyPlan(settings = {}) {
  const config = normalizeFacebookSettings(settings);
  const variant = getWorkflowById("WF-03")?.variants.find((v) => v.id === "image");
  if (!variant || variant.steps.length !== FACEBOOK_READY_STEPS.length ||
      variant.steps.some((step, index) => step !== FACEBOOK_READY_STEPS[index])) {
    throw new Error("Facebook photo workflow registry changed; manual review required.");
  }
  return Object.freeze({workflowId: "WF-03", variantId: "image",
    steps: FACEBOOK_READY_STEPS, processingMode: "BROWSER_LOCAL", config});
}

export function createFacebookFilename(filename, presetId, mimeType) {
  if (!Object.hasOwn(FACEBOOK_PRESETS, presetId) || !VALID_MIME.includes(mimeType)) {
    throw new Error("Unsupported Facebook output type.");
  }
  const stem = String(filename).replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-")
    .slice(0, 64).replace(/^-+|-+$/g, "") || "photo";
  const ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mimeType];
  return `${stem}-facebook-${presetId}.${ext}`;
}
