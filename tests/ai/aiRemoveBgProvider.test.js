import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import {
  REMOVE_BG_ENDPOINT,
  REMOVE_BG_CONNECTED_TO_PUBLIC_ROUTE,
  REMOVE_BG_MAX_OUTPUT_BYTES,
  RemoveBgProviderError,
  runRemoveBgProvider,
  validateRemoveBgInput,
} from "../../lib/ai/aiRemoveBgProvider.mjs";

const PNG = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR4nGP8zwABTFCaAQARJQED72uL6QAAAABJRU5ErkJggg==",
  "base64"
));

const INPUT = {
  imageBytes: PNG,
  mimeType: "image/png",
  width: 2,
  height: 2,
  serverDecoded: true,
};

function goodResponse(bytes = PNG, headers = {}) {
  return new Response(bytes, {
    status: 200,
    headers: { "content-type": "image/png", ...headers },
  });
}

function testArguments(overrides = {}) {
  return {
    ...INPUT,
    enabled: true,
    apiKey: "fake-secret-only-for-test",
    fetchFn: async () => goodResponse(),
    ...overrides,
  };
}

async function rejection(args, code) {
  await assert.rejects(
    () => runRemoveBgProvider(args),
    (error) => error instanceof RemoveBgProviderError && error.code === code
  );
}

describe("Phase 21 / 10B remove.bg safe transport boundary", () => {
  test("transport is not connected to a public route", () => {
    assert.equal(REMOVE_BG_CONNECTED_TO_PUBLIC_ROUTE, false);
    assert.equal(REMOVE_BG_ENDPOINT, "https://api.remove.bg/v1.0/removebg");
  });

  test("paid transport is disabled by default even with a key", async () => {
    let calls = 0;
    await rejection({ ...INPUT, apiKey: "fake-secret", fetchFn: () => { calls++; } }, "DISABLED");
    assert.equal(calls, 0);
  });

  test("untrusted client dimensions cannot authorize dispatch", async () => {
    let calls = 0;
    await rejection(testArguments({ serverDecoded: false, fetchFn: () => { calls++; } }), "SERVER_DECODE_REQUIRED");
    assert.equal(calls, 0);
  });

  test("accepts bounded, server-decoded source bytes", () => {
    const result = validateRemoveBgInput(INPUT);
    assert.equal(result.inputBytes, PNG.byteLength);
    assert.equal(result.extension, "png");
  });

  test("rejects empty, tiny and oversized sources", async () => {
    for (const bytes of [new Uint8Array(0), new Uint8Array(11), new Uint8Array(10 * 1024 * 1024 + 1)]) {
      await rejection(testArguments({ imageBytes: bytes }), "INVALID_IMAGE_SIZE");
    }
  });

  test("rejects non-byte source values", async () => {
    await rejection(testArguments({ imageBytes: "not-bytes" }), "INVALID_IMAGE");
  });

  test("blocks SVG and spoofed image signatures", async () => {
    await rejection(testArguments({ mimeType: "image/svg+xml" }), "INVALID_IMAGE_TYPE");
    await rejection(testArguments({ mimeType: "image/jpeg" }), "INVALID_IMAGE_TYPE");
  });

  test("allows signatures for JPEG and WebP source format", () => {
    const jpeg = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 0, 0]);
    const webp = Uint8Array.from(Buffer.from("RIFF0000WEBP", "ascii"));
    assert.equal(validateRemoveBgInput({ ...INPUT, imageBytes: jpeg, mimeType: "image/jpeg" }).extension, "jpg");
    assert.equal(validateRemoveBgInput({ ...INPUT, imageBytes: webp, mimeType: "image/webp" }).extension, "webp");
  });

  test("rejects bad dimensions, excessive pixels and nonintegers", async () => {
    for (const [width, height] of [[0, 2], [8001, 2], [7000, 5000], [1.1, 2]]) {
      await rejection(testArguments({ width, height }), "INVALID_IMAGE_DIMENSIONS");
    }
  });

  test("missing provider API key refuses dispatch", async () => {
    let calls = 0;
    await rejection(testArguments({ apiKey: "", fetchFn: () => { calls++; } }), "MISSING_API_KEY");
    assert.equal(calls, 0);
  });

  test("invalid transport refuses dispatch", async () => {
    await rejection(testArguments({ fetchFn: null }), "INVALID_TRANSPORT");
  });

  test("sends only source file, size, format and server-side X-Api-Key", async () => {
    let calls = 0;
    const result = await runRemoveBgProvider(testArguments({
      fetchFn: async (url, options) => {
        calls++;
        assert.equal(url, REMOVE_BG_ENDPOINT);
        assert.equal(options.method, "POST");
        assert.equal(options.headers["X-Api-Key"], "fake-secret-only-for-test");
        assert.equal(options.redirect, "error");
        assert.equal(options.cache, "no-store");
        assert.ok(options.signal);
        assert.ok(options.body instanceof FormData);
        assert.deepEqual(Array.from(options.body.keys()).sort(), ["format", "image_file", "size"]);
        assert.equal(options.body.get("size"), "auto");
        assert.equal(options.body.get("format"), "png");
        const file = options.body.get("image_file");
        assert.equal(file.type, "image/png");
        assert.equal(file.name, "source.png");
        assert.deepEqual(new Uint8Array(await file.arrayBuffer()), PNG);
        return goodResponse();
      },
    }));
    assert.equal(calls, 1);
    assert.equal(result.status, "SUCCESS");
    assert.equal(result.provider, "remove.bg");
    assert.equal(result.mimeType, "image/png");
    assert.equal(result.generated, true);
    assert.equal(result.originalUnchanged, true);
    assert.equal(result.providerCreditUnits, 1);
    assert.deepEqual(result.bytes, PNG);
    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
  });

  test("invalid API response is unknown after transport dispatch", async () => {
    await rejection(testArguments({ fetchFn: async () => null }), "PROVIDER_UNKNOWN");
  });

  test("HTTP 401 errors never echo vendor text or secret", async () => {
    const key = "do-not-print-secret";
    await assert.rejects(
      () => runRemoveBgProvider(testArguments({
        apiKey: key,
        fetchFn: async () => new Response(`secret ${key}`, { status: 401 }),
      })),
      (error) => error.code === "PROVIDER_REJECTED" && error.httpStatus === 401 &&
        error.dispatched && error.safeToRefund === false && !error.message.includes(key)
    );
  });

  test("credit exhaustion is distinguishable but NOT auto-refunded", async () => {
    await assert.rejects(
      () => runRemoveBgProvider(testArguments({ fetchFn: async () => new Response("No credits", { status: 402 }) })),
      (error) => error.code === "INSUFFICIENT_PROVIDER_CREDITS" && error.dispatched && !error.safeToRefund
    );
  });

  test("HTTP 504 is marked as dispatched and unsafe to retry automatically", async () => {
    await assert.rejects(
      () => runRemoveBgProvider(testArguments({ fetchFn: async () => new Response("timeout", { status: 504 }) })),
      (error) => error.code === "PROVIDER_REJECTED" && error.dispatched && !error.safeToRefund
    );
  });

  test("network throw or timeout is UNKNOWN, without an automatic refund", async () => {
    await assert.rejects(
      () => runRemoveBgProvider(testArguments({ fetchFn: async () => { throw new Error("network timeout"); } })),
      (error) => error.code === "PROVIDER_UNKNOWN" && error.dispatched && !error.safeToRefund
    );
  });

  test("rejects non-PNG success body", async () => {
    await rejection(testArguments({ fetchFn: async () => new Response("not an image", { headers: { "content-type": "text/html" } }) }), "INVALID_RESULT");
  });

  test("rejects non-transparent PNG result (no alpha channel)", async () => {
    const rgb = PNG.slice();
    rgb[25] = 2; // PNG RGB (no alpha), deliberately invalid CRC too.
    await rejection(testArguments({ fetchFn: async () => goodResponse(rgb) }), "INVALID_RESULT");
  });

  test("rejects truncated and absent output chunks", async () => {
    await rejection(testArguments({ fetchFn: async () => goodResponse(PNG.slice(0, 32)) }), "INVALID_RESULT");
    const missingEnd = PNG.slice(0, PNG.length - 12);
    await rejection(testArguments({ fetchFn: async () => goodResponse(missingEnd) }), "INVALID_RESULT");
  });

  test("rejects impossible advertised content-length without allocating it", async () => {
    await rejection(testArguments({ fetchFn: async () => goodResponse(PNG, { "content-length": `${REMOVE_BG_MAX_OUTPUT_BYTES + 1}` }) }), "OUTPUT_TOO_LARGE");
  });

  test("bounds streamed bytes even with no content-length", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(REMOVE_BG_MAX_OUTPUT_BYTES + 1));
        controller.close();
      },
    });
    await rejection(testArguments({ fetchFn: async () => new Response(stream, { headers: { "content-type": "image/png" } }) }), "OUTPUT_TOO_LARGE");
  });
});
