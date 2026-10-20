// WF-02 Instagram photo beta. Presets are examples, not an Instagram acceptance guarantee.
import {getWorkflowById} from "./registry.js";

export const INSTAGRAM_READY_STEPS = Object.freeze(["IMG-08", "IMG-03", "IMG-01"]);
export const INSTAGRAM_PRESETS = Object.freeze({
  square: Object.freeze({label: "Square post", width: 1080, height: 1080}),
  portrait: Object.freeze({label: "Portrait post", width: 1080, height: 1350}),
  story: Object.freeze({label: "Story image", width: 1080, height: 1920}),
});
export const INSTAGRAM_READY_LIMITS = Object.freeze({
  maxFileBytes: 10 * 1024 * 1024,
  maxDimension: 8000,
  maxInputPixels: 20_000_000,
  maxOutputBytes: 20 * 1024 * 1024,
});
const VALID_MIME = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const SETTINGS = Object.freeze(["presetId", "horizontalPosition", "verticalPosition", "qualityPercent"]);

export function normalizeInstagramSettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
      Object.keys(settings).some((key) => !SETTINGS.includes(key))) {
    throw new Error("Unsupported Instagram settings.");
  }
  const presetId = settings.presetId ?? "portrait";
  if (typeof presetId !== "string" || !Object.hasOwn(INSTAGRAM_PRESETS, presetId)) {
    throw new Error("Choose a supported Instagram image preset.");
  }
  const horizontalPosition = settings.horizontalPosition ?? 50;
  const verticalPosition = settings.verticalPosition ?? 50;
  const qualityPercent = settings.qualityPercent ?? 80;
  if (![horizontalPosition, verticalPosition].every((n) => Number.isInteger(n) && n >= 0 && n <= 100) ||
      ![70, 80, 90].includes(qualityPercent)) {
    throw new Error("Position must be 0–100 and compression preset must be 70, 80 or 90.");
  }
  return Object.freeze({presetId, horizontalPosition, verticalPosition, qualityPercent,
    ...INSTAGRAM_PRESETS[presetId]});
}

export function validateInstagramFile(file) {
  if (!file || typeof file.name !== "string" || !file.name.trim() ||
      !Number.isSafeInteger(file.size) || file.size < 1 ||
      file.size > INSTAGRAM_READY_LIMITS.maxFileBytes || !VALID_MIME.includes(file.type)) {
    throw new Error("Choose a non-empty JPG, PNG or WebP photo up to 10 MB.");
  }
  return file;
}

export function validateInstagramSource(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 ||
      width > INSTAGRAM_READY_LIMITS.maxDimension ||
      height > INSTAGRAM_READY_LIMITS.maxDimension ||
      width * height > INSTAGRAM_READY_LIMITS.maxInputPixels) {
    throw new Error("Input image exceeds safe browser processing dimensions.");
  }
  return Object.freeze({width, height});
}

export function getInstagramCrop(source, settings = {}) {
  const dims = validateInstagramSource(source?.width, source?.height);
  const config = normalizeInstagramSettings(settings);
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

export function getInstagramReadyPlan(settings = {}) {
  const config = normalizeInstagramSettings(settings);
  const variant = getWorkflowById("WF-02")?.variants.find((v) => v.id === "image");
  if (!variant || variant.steps.length !== INSTAGRAM_READY_STEPS.length ||
      variant.steps.some((step, index) => step !== INSTAGRAM_READY_STEPS[index])) {
    throw new Error("Instagram photo workflow registry changed; manual review required.");
  }
  return Object.freeze({workflowId: "WF-02", variantId: "image",
    steps: INSTAGRAM_READY_STEPS, processingMode: "BROWSER_LOCAL", config});
}

export function createInstagramFilename(filename, presetId, mimeType) {
  if (!Object.hasOwn(INSTAGRAM_PRESETS, presetId) || !VALID_MIME.includes(mimeType)) {
    throw new Error("Unsupported Instagram output type.");
  }
  const stem = String(filename).replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-")
    .slice(0, 64).replace(/^-+|-+$/g, "") || "photo";
  const ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mimeType];
  return `${stem}-instagram-${presetId}.${ext}`;
}
