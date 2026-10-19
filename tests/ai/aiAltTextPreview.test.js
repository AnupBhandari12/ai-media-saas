import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  handleLocalAltTextPreview,
  isLocalAltTextPreviewEnabled,
} from "../../lib/ai/aiAltTextPreview.mjs";

const URL = "http://localhost:3000/api/ai/alt-text/preview";
const quota = {
  allowed: true,
  daily: { used: 0, limit: 3, remaining: 3 },
  monthly: { used: 0, limit: 20, remaining: 20 },
};

function post(body, extraHeaders = {}) {
  return new Request(URL, {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "content-type": "application/json",
      ...extraHeaders,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function invoke(request, options = {}) {
  return handleLocalAltTextPreview({
    request,
    enabled: true,
    userId: "user_alt_123",
    readQuota: async () => quota,
    ...options,
  });
}

describe("Phase 21 AI-08 local mock alt text preview", () => {
  test("requires development and explicit server opt-in", () => {
    assert.equal(isLocalAltTextPreviewEnabled({ nodeEnv: "production", flag: "1" }), false);
    assert.equal(isLocalAltTextPreviewEnabled({ nodeEnv: "development", flag: "true" }), false);
    assert.equal(isLocalAltTextPreviewEnabled({ nodeEnv: "development", flag: "1" }), true);
  });

  test("disabled by default before any quota access", async () => {
    let calls = 0;
    const result = await invoke(post({ description: "Blue vase" }), {
      enabled: false,
      readQuota: async () => { calls++; return quota; },
    });
    assert.equal(result.status, 404);
    assert.equal(calls, 0);
  });

  test("blocks unauthenticated request before quota access", async () => {
    let calls = 0;
    const result = await invoke(post({ description: "Blue vase" }), {
      userId: null,
      readQuota: async () => { calls++; return quota; },
    });
    assert.equal(result.status, 401);
    assert.equal(calls, 0);
  });

  test("requires exact same-origin POST", async () => {
    assert.equal((await invoke(post({ description: "Blue vase" }, { origin: "https://example.com" }))).status, 403);
    const req = new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({description:"Blue vase"}) });
    assert.equal((await invoke(req)).status, 403);
  });

  test("requires JSON content type", async () => {
    const res = await invoke(post({ description: "Blue vase" }, { "content-type": "text/plain" }));
    assert.equal(res.status, 415);
  });

  test("rejects malformed JSON and nonobjects", async () => {
    assert.equal((await invoke(post("{not json"))).status, 400);
    assert.equal((await invoke(post("[1,2,3]"))).status, 400);
  });

  test("rejects oversized bytes with or without content-length", async () => {
    assert.equal((await invoke(post({ description: "x".repeat(5000) }))).status, 413);
    assert.equal((await invoke(post({ description: "Blue vase" }, { "content-length": "100000" }))).status, 413);
  });

  test("blocks client switches, image objects and provider fields", async () => {
    for (const body of [
      { description: "Blue vase", provider: "openai" },
      { description: "Blue vase", image: "data:image/png;base64,x" },
      { description: "Blue vase", enabled: true },
      { description: "Blue vase", model: "some-model" },
    ]) {
      assert.equal((await invoke(post(body))).status, 400);
    }
  });

  test("requires a bounded human-written description", async () => {
    for (const description of ["", "aa", 123, "x".repeat(1201)]) {
      assert.equal((await invoke(post({ description }))).status, 400);
    }
  });

  test("returns unmistakable non-AI mock from user text", async () => {
    const result = await invoke(post({ description: "  Blue vase on a table  " }));
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.quota, quota);
    assert.equal(result.body.mode, "MOCK_ONLY");
    assert.equal(result.body.task, "ALT_TEXT");
    assert.equal(result.body.source, "USER_DESCRIPTION");
    assert.equal(result.body.generated, false);
    assert.equal(result.body.imageAnalyzed, false);
    assert.equal(result.body.quotaConsumed, false);
    assert.equal(result.body.text, "MOCK PREVIEW ONLY — Blue vase on a table");
  });

  test("reads quota exactly once for authenticated owner", async () => {
    const owners = [];
    const result = await invoke(post({ description: "A cup on a desk" }), {
      readQuota: async (owner) => { owners.push(owner); return quota; },
    });
    assert.equal(result.status, 200);
    assert.deepEqual(owners, ["user_alt_123"]);
  });

  test("supports Unicode without inventing visual details", async () => {
    const result = await invoke(post({ description: "  हिमाल र हरियो खेत  " }));
    assert.equal(result.status, 200);
    assert.equal(result.body.text, "MOCK PREVIEW ONLY — हिमाल र हरियो खेत");
  });
});
