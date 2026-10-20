// WF-04 Stage 08: Post-photo branch only. Dimensions are maximum boxes, not crops.
import {getWorkflowById} from "./registry.js";

export const LINKEDIN_READY_STEPS = Object.freeze(["IMG-03", "IMG-05", "IMG-01"]);
export const LINKEDIN_PRESETS = Object.freeze({
  landscape: Object.freeze({label: "Landscape post", maxWidth: 1200, maxHeight: 627}),
  square: Object.freeze({label: "Square-friendly post", maxWidth: 1080, maxHeight: 1080}),
  portrait: Object.freeze({label: "Portrait post", maxWidth: 1080, maxHeight: 1350}),
});
export const LINKEDIN_LIMITS = Object.freeze({
  maxInputBytes: 10 * 1024 * 1024,
  maxOutputBytes: 20 * 1024 * 1024,
  maxDimension: 8000,
  maxInputPixels: 20_000_000,
});
const INPUT_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const KEYS = Object.freeze(["presetId", "qualityPercent"]);

export function normalizeLinkedInSettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
      Object.keys(settings).some((key) => !KEYS.includes(key))) {
    throw new Error("Unsupported LinkedIn post settings.");
  }
  const presetId = settings.presetId ?? "landscape";
  const qualityPercent = settings.qualityPercent ?? 80;
  if (typeof presetId !== "string" || !Object.hasOwn(LINKEDIN_PRESETS, presetId) ||
      ![70, 80, 90].includes(qualityPercent)) {
    throw new Error("Select a listed LinkedIn post preset and quality (70, 80, 90).");
  }
  return Object.freeze({presetId, qualityPercent, ...LINKEDIN_PRESETS[presetId]});
}

export function validateLinkedInFile(file) {
  if (!file || typeof file.name !== "string" || !file.name.trim() ||
      !Number.isSafeInteger(file.size) || file.size < 1 ||
      file.size > LINKEDIN_LIMITS.maxInputBytes || !INPUT_TYPES.includes(file.type)) {
    throw new Error("Choose a non-empty JPG, PNG or WebP image up to 10 MB.");
  }
  return file;
}

export function validateLinkedInSource(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 ||
      width > LINKEDIN_LIMITS.maxDimension || height > LINKEDIN_LIMITS.maxDimension ||
      width * height > LINKEDIN_LIMITS.maxInputPixels) {
    throw new Error("Image dimensions exceed browser processing limits.");
  }
  return Object.freeze({width, height});
}

export function calculateLinkedInSize(source, settings = {}) {
  const {width, height} = validateLinkedInSource(source?.width, source?.height);
  const {maxWidth, maxHeight} = normalizeLinkedInSettings(settings);
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return Object.freeze({
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale)),
    scaledDown: scale < 1,
  });
}

export function getLinkedInReadyPlan(settings = {}) {
  const config = normalizeLinkedInSettings(settings);
  const variant = getWorkflowById("WF-04")?.variants.find((v) => v.id === "post");
  if (!variant || variant.steps.length !== LINKEDIN_READY_STEPS.length ||
      variant.steps.some((id, i) => id !== LINKEDIN_READY_STEPS[i])) {
    throw new Error("LinkedIn workflow registry differs from approved post-image sequence.");
  }
  return Object.freeze({workflowId: "WF-04", variantId: "post",
    steps: LINKEDIN_READY_STEPS, processingMode: "BROWSER_LOCAL", config});
}

export function createLinkedInFilename(filename, presetId) {
  if (!Object.hasOwn(LINKEDIN_PRESETS, presetId)) throw new Error("Unsupported LinkedIn preset.");
  const stem = String(filename).replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-")
    .slice(0, 64).replace(/^-+|-+$/g, "") || "image";
  return `${stem}-linkedin-${presetId}.jpg`;
}
