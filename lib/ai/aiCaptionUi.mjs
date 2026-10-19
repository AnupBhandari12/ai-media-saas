/**
 * Phase 21 caption UI contract.
 * Deliberately supports only the local MOCK preview endpoint in Commit 08A.
 * Nothing in this module activates a paid AI provider.
 */
export const CAPTION_MAX_CHARACTERS = 1200;
export const CAPTION_MIN_CHARACTERS = 3;
export const CAPTION_PREVIEW_ENDPOINT = "/api/ai/caption/preview";
export const CAPTION_QUOTA_ENDPOINT = "/api/ai/quota";

export const CAPTION_EXAMPLES = Object.freeze([
  Object.freeze({
    label: "Product launch",
    text: "Announcing a reusable water bottle for everyday travel, with a leak-proof lid and a lightweight design.",
  }),
  Object.freeze({
    label: "Travel moment",
    text: "A calm sunrise over the Himalayas, with soft golden light and distant snow-covered peaks.",
  }),
  Object.freeze({
    label: "Business update",
    text: "Our small design team just completed a modern website for a local coffee shop.",
  }),
]);

export function validateCaptionDescription(value) {
  if (typeof value !== "string") {
    return { valid: false, trimmed: "", count: 0, message: "Description must be text." };
  }
  const trimmed = value.trim();
  if (trimmed.length < CAPTION_MIN_CHARACTERS) {
    return {
      valid: false,
      trimmed,
      count: value.length,
      message: "Enter at least 3 characters.",
    };
  }
  if (trimmed.length > CAPTION_MAX_CHARACTERS) {
    return {
      valid: false,
      trimmed,
      count: value.length,
      message: "Maximum 1,200 characters allowed.",
    };
  }
  return { valid: true, trimmed, count: value.length, message: "Ready to preview." };
}

export function createCaptionPreviewBody(value) {
  const validated = validateCaptionDescription(value);
  if (!validated.valid) throw new Error(validated.message);
  // The server explicitly rejects extra client-side keys such as model or provider.
  return { description: validated.trimmed };
}

function parseQuotaCounter(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Quota data unavailable.");
  }
  const { used, limit, remaining } = value;
  if (![used, limit, remaining].every((n) => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error("Quota data unavailable.");
  }
  if (remaining !== Math.max(0, limit - used)) {
    throw new Error("Quota data unavailable.");
  }
  return { used, limit, remaining };
}

export function parseCaptionQuota(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Quota data unavailable.");
  }
  const daily = parseQuotaCounter(payload.daily);
  const monthly = parseQuotaCounter(payload.monthly);
  if (typeof payload.allowed !== "boolean") {
    throw new Error("Quota data unavailable.");
  }
  if (payload.allowed !== (daily.remaining > 0 && monthly.remaining > 0)) {
    throw new Error("Quota data unavailable.");
  }
  return { allowed: payload.allowed, daily, monthly };
}

export function parseLocalCaptionPreview(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid mock preview response.");
  }
  // Never accidentally render a server response as real AI content.
  if (
    payload.mode !== "MOCK_ONLY" ||
    payload.generated !== false ||
    payload.quotaConsumed !== false ||
    typeof payload.text !== "string" ||
    !payload.text.startsWith("MOCK PREVIEW ONLY — ") ||
    payload.text.length > 2000
  ) {
    throw new Error("Invalid mock preview response.");
  }
  const quota = parseCaptionQuota(payload.quota);
  return { text: payload.text, quota, mode: "MOCK_ONLY", generated: false, quotaConsumed: false };
}

export function getCaptionPreviewError(status) {
  if (status === 404) {
    return "Local mock preview is disabled. In development, set AI_CAPTION_MOCK_PREVIEW=1 and restart the dev server.";
  }
  if (status === 401) return "Your session expired. Sign in again to continue.";
  if (status === 403) return "Request blocked by origin protection. Open the page from the local app.";
  if (status === 413) return "Description request is too large.";
  if (status === 400 || status === 415) return "Please check your description and try again.";
  return "Preview could not be loaded. No AI action was performed.";
}
