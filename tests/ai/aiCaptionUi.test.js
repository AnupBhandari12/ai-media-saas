import { describe, test } from "bun:test";
import assert from "node:assert/strict";

import {
  CAPTION_EXAMPLES,
  CAPTION_MAX_CHARACTERS,
  CAPTION_PREVIEW_ENDPOINT,
  CAPTION_QUOTA_ENDPOINT,
  createCaptionPreviewBody,
  getCaptionPreviewError,
  parseCaptionQuota,
  parseLocalCaptionPreview,
  validateCaptionDescription,
} from "../../lib/ai/aiCaptionUi.mjs";

const validQuota = {
  allowed: true,
  daily: { used: 1, limit: 3, remaining: 2 },
  monthly: { used: 4, limit: 20, remaining: 16 },
};

function mockResult() {
  return {
    mode: "MOCK_ONLY",
    generated: false,
    quotaConsumed: false,
    text: "MOCK PREVIEW ONLY — Sunrise over Nepal",
    quota: structuredClone(validQuota),
  };
}

describe("Phase 21 local mock caption UI contract", () => {
  test("uses same-origin local preview and quota endpoints only", () => {
    assert.equal(CAPTION_PREVIEW_ENDPOINT, "/api/ai/caption/preview");
    assert.equal(CAPTION_QUOTA_ENDPOINT, "/api/ai/quota");
  });

  test("accepts a trimmed valid description", () => {
    const result = validateCaptionDescription("  Mountain sunrise  ");
    assert.equal(result.valid, true);
    assert.equal(result.trimmed, "Mountain sunrise");
  });

  test("rejects blank, too-short and non-text descriptions", () => {
    for (const value of ["", "   ", " a ", 123, undefined, null]) {
      assert.equal(validateCaptionDescription(value).valid, false);
    }
  });

  test("enforces server-matching 1200 trimmed character limit", () => {
    assert.equal(CAPTION_MAX_CHARACTERS, 1200);
    assert.equal(validateCaptionDescription("a".repeat(1200)).valid, true);
    assert.equal(validateCaptionDescription("a".repeat(1201)).valid, false);
  });

  test("handles Unicode descriptions", () => {
    assert.equal(createCaptionPreviewBody("  नेपालको हिमाल  ").description, "नेपालको हिमाल");
  });

  test("submits only the description field, no provider switches", () => {
    assert.deepEqual(createCaptionPreviewBody("  Sunset at lake  "), {
      description: "Sunset at lake",
    });
  });

  test("rejects invalid descriptions before fetch payload creation", () => {
    assert.throws(() => createCaptionPreviewBody("no"), /3 characters/);
  });

  test("provides reasonable example descriptions", () => {
    assert.equal(CAPTION_EXAMPLES.length, 3);
    for (const item of CAPTION_EXAMPLES) {
      assert.equal(typeof item.label, "string");
      assert.equal(validateCaptionDescription(item.text).valid, true);
    }
  });

  test("parses daily and monthly quota, preserving remaining slots", () => {
    assert.deepEqual(parseCaptionQuota(validQuota), validQuota);
  });

  test("supports fully exhausted quota", () => {
    const result = parseCaptionQuota({
      allowed: false,
      daily: { used: 3, limit: 3, remaining: 0 },
      monthly: { used: 3, limit: 20, remaining: 17 },
    });
    assert.equal(result.allowed, false);
    assert.equal(result.daily.remaining, 0);
  });

  test("rejects fake or inconsistent quota numbers", () => {
    const bad = structuredClone(validQuota);
    bad.daily.remaining = 999;
    assert.throws(() => parseCaptionQuota(bad), /Quota data unavailable/);
    bad.daily.remaining = 2;
    bad.monthly.used = -1;
    assert.throws(() => parseCaptionQuota(bad), /Quota data unavailable/);
  });

  test("rejects contradictory allowed flag", () => {
    const bad = structuredClone(validQuota);
    bad.allowed = false;
    assert.throws(() => parseCaptionQuota(bad), /Quota data unavailable/);
  });

  test("accepts only explicitly fake mock preview results", () => {
    const result = parseLocalCaptionPreview(mockResult());
    assert.equal(result.mode, "MOCK_ONLY");
    assert.equal(result.generated, false);
    assert.equal(result.quotaConsumed, false);
    assert.match(result.text, /^MOCK PREVIEW ONLY/);
  });

  test("never treats a real-provider response as a valid local mock preview", () => {
    const result = mockResult();
    for (const [key, value] of [
      ["mode", "REAL"], ["generated", true], ["quotaConsumed", true],
      ["text", "Here is a real AI generated caption"],
    ]) {
      const bad = { ...result, [key]: value };
      assert.throws(() => parseLocalCaptionPreview(bad), /Invalid mock preview/);
    }
  });

  test("rejects an oversized preview response", () => {
    const bad = mockResult();
    bad.text = "MOCK PREVIEW ONLY — " + "a".repeat(2200);
    assert.throws(() => parseLocalCaptionPreview(bad), /Invalid mock preview/);
  });

  test("explains opt-in when local mock API is disabled", () => {
    assert.match(getCaptionPreviewError(404), /AI_CAPTION_MOCK_PREVIEW=1/);
    assert.match(getCaptionPreviewError(401), /Sign in/);
    assert.match(getCaptionPreviewError(500), /No AI action/);
  });
});
