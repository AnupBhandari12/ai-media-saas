// Phase 22 Stage 09: WF-05 thumbnail ONLY. Video remains preview-only.
import {getWorkflowById} from "./registry.js";

export const YOUTUBE_READY_STEPS = Object.freeze(["CRT-04", "IMG-02"]);
export const YOUTUBE_TEMPLATES = Object.freeze({
  BOLD_LEFT: Object.freeze({label: "Bold left", help: "Large readable title to the left"}),
  CENTERED: Object.freeze({label: "Centered", help: "Bold title in the middle"}),
  CLEAN_BOTTOM: Object.freeze({label: "Clean bottom", help: "Text near the bottom edge"}),
});
export const YOUTUBE_READY_TARGETS = Object.freeze([512, 1024, 2048]);
export const YOUTUBE_READY_LIMITS = Object.freeze({
  maxInputBytes: 10 * 1024 * 1024,
  maxOutputBytes: 12 * 1024 * 1024,
  maxDimension: 8000,
  maxInputPixels: 20_000_000,
  width: 1280,
  height: 720,
});
const ALLOWED_TYPES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_KEYS = Object.freeze(["template", "title", "subtitle", "focusX", "focusY", "targetKb"]);

export function normalizeYouTubeReadySettings(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings) ||
      Object.keys(settings).some((key) => !ALLOWED_KEYS.includes(key))) {
    throw new Error("Unsupported YouTube thumbnail settings.");
  }
  const template = settings.template ?? "BOLD_LEFT";
  const title = settings.title ?? "YOUR VIDEO TITLE";
  const subtitle = settings.subtitle ?? "";
  const focusX = settings.focusX ?? 50;
  const focusY = settings.focusY ?? 50;
  const targetKb = settings.targetKb ?? 2048;
  if (!Object.hasOwn(YOUTUBE_TEMPLATES, template)) throw new Error("Choose an approved thumbnail template.");
  if (typeof title !== "string" || title.trim().length < 3 || title.trim().length > 100 ||
      /[\u0000-\u001f\u007f]/.test(title)) {
    throw new Error("Enter a thumbnail title between 3 and 100 characters.");
  }
  if (typeof subtitle !== "string" || subtitle.length > 140 || /[\u0000-\u001f\u007f]/.test(subtitle)) {
    throw new Error("Subtitle is too long or contains invalid characters.");
  }
  if (![focusX, focusY].every((value) => Number.isInteger(value) && value >= 0 && value <= 100)) {
    throw new Error("Focus must be between 0 and 100.");
  }
  if (!YOUTUBE_READY_TARGETS.includes(targetKb)) throw new Error("Choose a listed output-size goal.");
  return Object.freeze({template, title: title.trim(), subtitle: subtitle.trim(), focusX, focusY, targetKb});
}

export function validateYouTubeReadyFile(file) {
  if (!file || typeof file.name !== "string" || !file.name.trim() ||
      !Number.isSafeInteger(file.size) || file.size < 1 || file.size > YOUTUBE_READY_LIMITS.maxInputBytes ||
      !ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Choose a non-empty JPG, PNG or WebP image up to 10 MB.");
  }
  return file;
}
export function validateYouTubeReadyDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 ||
      width > YOUTUBE_READY_LIMITS.maxDimension || height > YOUTUBE_READY_LIMITS.maxDimension ||
      width * height > YOUTUBE_READY_LIMITS.maxInputPixels) {
    throw new Error("Source image dimensions exceed browser processing limits.");
  }
  return Object.freeze({width,height});
}
export function getYouTubeReadyPlan(settings = {}) {
  const config = normalizeYouTubeReadySettings(settings);
  const variant = getWorkflowById("WF-05")?.variants.find((candidate) => candidate.id === "thumbnail");
  if (!variant || variant.steps.length !== YOUTUBE_READY_STEPS.length ||
      variant.steps.some((id, index) => id !== YOUTUBE_READY_STEPS[index])) {
    throw new Error("YouTube thumbnail workflow differs from the approved registry.");
  }
  return Object.freeze({workflowId:"WF-05",variantId:"thumbnail",processingMode:"BROWSER_LOCAL",
    steps:YOUTUBE_READY_STEPS,config});
}
export function createYouTubeReadyFilename(filename) {
  const base = String(filename).replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-").slice(0,64).replace(/^-+|-+$/g, "") || "thumbnail";
  return `${base}-youtube-ready.jpg`;
}
