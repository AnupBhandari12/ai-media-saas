import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  CAPTION_PREVIEW_MAX_BYTES,
  handleLocalCaptionPreview,
  isLocalCaptionPreviewEnabled,
} from "../../lib/ai/aiCaptionPreview.mjs";

const url = "http://localhost:3000/api/ai/caption/preview";
const quota = Object.freeze({
  allowed: true,
  daily: { used: 0, limit: 3, remaining: 3 },
  monthly: { used: 0, limit: 20, remaining: 20 },
});

function makeRequest(value = { description: "A snowy mountain" }, options = {}) {
  const body = options.raw ?? JSON.stringify(value);
  return new Request(url, {
    method: "POST",
    headers: {
      "origin": options.origin ?? "http://localhost:3000",
      "content-type": options.contentType ?? "application/json",
    },
    body,
  });
}

function args(request, opts = {}) {
  return {
    request, userId: "user_123", enabled: true,
    readQuota: async () => quota, ...opts,
  };
}

describe("Phase 21 mock-only local caption preview", () => {
  test("env gate requires both development and explicit opt-in", () => {
    assert.equal(isLocalCaptionPreviewEnabled({ nodeEnv: "production", flag: "1" }), false);
    assert.equal(isLocalCaptionPreviewEnabled({ nodeEnv: "development", flag: "true" }), false);
    assert.equal(isLocalCaptionPreviewEnabled({ nodeEnv: "development", flag: "1" }), true);
  });

  test("disabled guard happens before reading quota or body", async () => {
    let reads = 0;
    const result = await handleLocalCaptionPreview({
      enabled: false,
      readQuota: async () => { reads++; return quota; },
    });
    assert.equal(result.status, 404);
    assert.equal(reads, 0);
  });

  test("unauthenticated requests are rejected before reading quota", async () => {
    let reads = 0;
    const result = await handleLocalCaptionPreview(args(makeRequest(), {
      userId: "", readQuota: async () => { reads++; return quota; },
    }));
    assert.equal(result.status, 401);
    assert.equal(reads, 0);
  });

  test("same-origin POST is required", async () => {
    const result = await handleLocalCaptionPreview(args(makeRequest(undefined, {
      origin: "https://evil.example",
    })));
    assert.equal(result.status, 403);
  });

  test("missing origin is rejected", async () => {
    const request = makeRequest();
    request.headers.delete("origin");
    const result = await handleLocalCaptionPreview(args(request));
    assert.equal(result.status, 403);
  });

  test("JSON content type is required", async () => {
    const result = await handleLocalCaptionPreview(args(makeRequest(undefined, {
      contentType: "text/plain",
    })));
    assert.equal(result.status, 415);
  });

  test("malformed JSON is rejected without querying quota", async () => {
    let reads = 0;
    const result = await handleLocalCaptionPreview(args(makeRequest(undefined, {
      raw: "{broken-json",
    }), { readQuota: async () => { reads++; return quota; } }));
    assert.equal(result.status, 400);
    assert.equal(reads, 0);
  });

  test("oversized body is rejected even without Content-Length", async () => {
    let reads = 0;
    const request = makeRequest(undefined, { raw: "x".repeat(CAPTION_PREVIEW_MAX_BYTES + 1) });
    request.headers.delete("content-length");
    const result = await handleLocalCaptionPreview(args(request, {
      readQuota: async () => { reads++; return quota; },
    }));
    assert.equal(result.status, 413);
    assert.equal(reads, 0);
  });

  test("client cannot enable a provider or supply model", async () => {
    const result = await handleLocalCaptionPreview(args(makeRequest({
      description: "A snowy mountain", enabled: true, model: "some-model",
    })));
    assert.equal(result.status, 400);
  });

  test("blank, short and nontext descriptions are rejected", async () => {
    for (const description of [" ", "ab", 25, "a".repeat(1201)]) {
      const result = await handleLocalCaptionPreview(args(makeRequest({ description })));
      assert.equal(result.status, 400);
    }
  });

  test("valid request returns unmistakably fake preview and actual remaining quota", async () => {
    let seenOwner;
    const result = await handleLocalCaptionPreview(args(makeRequest({
      description: "  Sunrise over Nepal  ",
    }), { readQuota: async (ownerId) => { seenOwner = ownerId; return quota; } }));
    assert.equal(result.status, 200);
    assert.equal(seenOwner, "user_123");
    assert.equal(result.body.mode, "MOCK_ONLY");
    assert.equal(result.body.generated, false);
    assert.equal(result.body.quotaConsumed, false);
    assert.equal(result.body.text, "MOCK PREVIEW ONLY — Sunrise over Nepal");
    assert.deepEqual(result.body.quota.daily, quota.daily);
    assert.deepEqual(result.body.quota.monthly, quota.monthly);
  });

  test("Unicode text is supported with bounded UTF-8 payload", async () => {
    const result = await handleLocalCaptionPreview(args(makeRequest({
      description: "नेपालको हिमाल",
    })));
    assert.equal(result.status, 200);
    assert.match(result.body.text, /नेपालको हिमाल/);
  });
});
