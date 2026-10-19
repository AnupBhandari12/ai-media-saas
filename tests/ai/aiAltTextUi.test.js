import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  ALT_TEXT_EXAMPLES,
  ALT_TEXT_MAX_LENGTH,
  ALT_TEXT_PREVIEW_ENDPOINT,
  ALT_TEXT_QUOTA_ENDPOINT,
  ALT_TEXT_MAX_IMAGE_BYTES,
  altTextPreviewError,
  createAltTextPreviewBody,
  parseLocalAltTextPreview,
  validateAltTextDescription,
  validateLocalAltTextImage,
} from "../../lib/ai/aiAltTextUi.mjs";

const quota = {
  allowed: true,
  daily: { used: 1, limit: 3, remaining: 2 },
  monthly: { used: 4, limit: 20, remaining: 16 },
};

function mock() {
  return {
    task: "ALT_TEXT",
    source: "USER_DESCRIPTION",
    mode: "MOCK_ONLY",
    generated: false,
    imageAnalyzed: false,
    quotaConsumed: false,
    text: "MOCK PREVIEW ONLY — Blue vase",
    quota: structuredClone(quota),
  };
}

describe("Phase 21 AI-08 safe alt text UI contract", () => {
  test("uses dedicated same-origin endpoints", () => {
    assert.equal(ALT_TEXT_PREVIEW_ENDPOINT, "/api/ai/alt-text/preview");
    assert.equal(ALT_TEXT_QUOTA_ENDPOINT, "/api/ai/quota");
  });

  test("accepts trimmed scene description", () => {
    assert.deepEqual(createAltTextPreviewBody("  A blue vase  "), { description: "A blue vase" });
  });

  test("rejects missing, short, nontext and long descriptions", () => {
    for (const value of ["", " ", "aa", null, 123, "a".repeat(1201)]) {
      assert.equal(validateAltTextDescription(value).valid, false);
      assert.throws(() => createAltTextPreviewBody(value));
    }
  });

  test("supports Unicode descriptions", () => {
    assert.deepEqual(createAltTextPreviewBody("  हिमाल र ताल  "), { description: "हिमाल र ताल" });
  });

  test("accepts up to 1200 characters", () => {
    assert.equal(ALT_TEXT_MAX_LENGTH, 1200);
    assert.equal(validateAltTextDescription("a".repeat(1200)).valid, true);
  });

  test("examples are suitable descriptive text", () => {
    assert.equal(ALT_TEXT_EXAMPLES.length, 3);
    for (const item of ALT_TEXT_EXAMPLES) {
      assert.equal(typeof item.label, "string");
      assert.equal(validateAltTextDescription(item.text).valid, true);
    }
  });

  test("accepts local PNG JPEG and WebP preview files", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp"]) {
      assert.equal(validateLocalAltTextImage({ type, size: 3000 }).valid, true);
    }
  });

  test("rejects SVG PDF empty and oversized images", () => {
    for (const file of [
      { type: "image/svg+xml", size: 200 },
      { type: "application/pdf", size: 3000 },
      { type: "image/png", size: 0 },
      { type: "image/png", size: ALT_TEXT_MAX_IMAGE_BYTES + 1 },
      { type: "image/png", size: Infinity },
      null,
    ]) assert.equal(validateLocalAltTextImage(file).valid, false);
  });

  test("parses fake preview with quota", () => {
    const result = parseLocalAltTextPreview(mock());
    assert.equal(result.imageAnalyzed, false);
    assert.equal(result.generated, false);
    assert.equal(result.text, mock().text);
    assert.deepEqual(result.quota, quota);
  });

  test("rejects anything pretending to be generated or image analyzed", () => {
    for (const [key, value] of [
      ["mode", "REAL"], ["task", "CAPTION"], ["source", "IMAGE_ANALYSIS"],
      ["imageAnalyzed", true], ["generated", true], ["quotaConsumed", true],
      ["text", "AI generated caption"],
    ]) {
      assert.throws(() => parseLocalAltTextPreview({ ...mock(), [key]: value }), /Invalid local mock/);
    }
  });

  test("rejects manipulated or missing quota values", () => {
    const bad = mock();
    bad.quota.daily.remaining = 999;
    assert.throws(() => parseLocalAltTextPreview(bad), /Quota data unavailable/);
  });

  test("explains disabled endpoint and authentication issues", () => {
    assert.match(altTextPreviewError(404), /AI_ALT_TEXT_MOCK_PREVIEW=1/);
    assert.match(altTextPreviewError(401), /sign in/);
    assert.match(altTextPreviewError(500), /no AI credit/i);
  });
});
