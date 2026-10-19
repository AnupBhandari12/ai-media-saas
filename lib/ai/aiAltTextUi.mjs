import { parseCaptionQuota } from "./aiCaptionUi.mjs";

export const ALT_TEXT_PREVIEW_ENDPOINT = "/api/ai/alt-text/preview";
export const ALT_TEXT_QUOTA_ENDPOINT = "/api/ai/quota";
export const ALT_TEXT_MIN_LENGTH = 3;
export const ALT_TEXT_MAX_LENGTH = 1200;
export const ALT_TEXT_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALT_TEXT_IMAGE_TYPES = Object.freeze([
  "image/png", "image/jpeg", "image/webp",
]);

export const ALT_TEXT_EXAMPLES = Object.freeze([
  Object.freeze({
    label: "Landscape",
    text: "A mountain range reflected in a still lake, with a cloudy sky overhead.",
  }),
  Object.freeze({
    label: "Product",
    text: "A stainless steel reusable water bottle standing on a plain white table.",
  }),
  Object.freeze({
    label: "Workspace",
    text: "An open laptop beside a notebook and coffee cup on a wooden desk.",
  }),
]);

export function validateAltTextDescription(value) {
  if (typeof value !== "string") {
    return { valid: false, text: "", error: "Describe the visible image content in text." };
  }
  const text = value.trim();
  if (text.length < ALT_TEXT_MIN_LENGTH) {
    return { valid: false, text, error: "Enter at least 3 characters." };
  }
  if (text.length > ALT_TEXT_MAX_LENGTH) {
    return { valid: false, text, error: "Maximum 1,200 characters allowed." };
  }
  return { valid: true, text, error: "" };
}

export function createAltTextPreviewBody(value) {
  const checked = validateAltTextDescription(value);
  if (!checked.valid) throw new Error(checked.error);
  // No image file, provider, model, or other untrusted client switches.
  return { description: checked.text };
}

export function validateLocalAltTextImage(file) {
  if (!file || typeof file !== "object") {
    return { valid: false, error: "Choose a PNG, JPEG or WebP image." };
  }
  if (!ALT_TEXT_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: "Only PNG, JPEG or WebP images are supported." };
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > ALT_TEXT_MAX_IMAGE_BYTES) {
    return { valid: false, error: "Image must be between 1 byte and 10 MB." };
  }
  return { valid: true, error: "" };
}

export function parseLocalAltTextPreview(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
    payload.mode !== "MOCK_ONLY" || payload.task !== "ALT_TEXT" ||
    payload.source !== "USER_DESCRIPTION" || payload.imageAnalyzed !== false ||
    payload.generated !== false || payload.quotaConsumed !== false ||
    typeof payload.text !== "string" ||
    !payload.text.startsWith("MOCK PREVIEW ONLY — ") ||
    payload.text.length > 2000) {
    throw new Error("Invalid local mock alt text response.");
  }
  return {
    text: payload.text,
    quota: parseCaptionQuota(payload.quota),
    mode: "MOCK_ONLY",
    imageAnalyzed: false,
    generated: false,
  };
}

export function altTextPreviewError(status) {
  if (status === 404) return "Local mock preview is disabled. Set AI_ALT_TEXT_MOCK_PREVIEW=1 in a development shell, then restart the server.";
  if (status === 401) return "Please sign in again.";
  if (status === 403) return "Origin protection blocked this request.";
  if (status === 413) return "Description is too large.";
  if (status === 400 || status === 415) return "Check your description and try again.";
  return "Mock preview is unavailable. No image was analyzed and no AI credit was spent.";
}
