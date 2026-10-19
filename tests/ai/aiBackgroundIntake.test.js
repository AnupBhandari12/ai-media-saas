import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  BACKGROUND_INTAKE_CONNECTED_TO_ROUTE,
  BACKGROUND_INTAKE_PROVIDER_ENABLED,
  BACKGROUND_INTAKE_RGBA_CHANNELS,
  BackgroundIntakeError,
  prepareBackgroundRemovalSource,
} from "../../lib/ai/aiBackgroundIntake.mjs";

const PNG = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEElEQVR4nGP8zwABTFCaAQARJQED72uL6QAAAABJRU5ErkJggg==",
  "base64"
));
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 2, 0xff, 0xd9, 0, 0, 0, 0]);
const WEBP = Uint8Array.from(Buffer.from("RIFF0000WEBP", "ascii"));

function fullDecode({ format = "png", width = 2, height = 2, channels = 4, pages = 1,
  pixels = new Uint8Array(16) } = {}) {
  return async () => ({ format, width, height, channels, pages, pixels });
}
const base = () => ({ ownerId: "user_clerk_test", imageBytes: PNG,
  declaredMimeType: "image/png", decodeImage: fullDecode() });

async function expectError(options, code) {
  await assert.rejects(() => prepareBackgroundRemovalSource(options), (error) =>
    error instanceof BackgroundIntakeError && error.code === code &&
    error.dispatched === false && error.safeToRefund === true);
}

describe("Phase 21 / 10C server image full-decode handoff", () => {
  test("not connected to any route or provider", () => {
    assert.equal(BACKGROUND_INTAKE_CONNECTED_TO_ROUTE, false);
    assert.equal(BACKGROUND_INTAKE_PROVIDER_ENABLED, false);
    assert.equal(BACKGROUND_INTAKE_RGBA_CHANNELS, 4);
  });
  test("prepares valid PNG bytes after a full RGBA decode", async () => {
    const result = await prepareBackgroundRemovalSource(base());
    assert.equal(result.mimeType, "image/png");
    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
    assert.equal(result.preparation, "FULL_RGBA_DECODED");
    assert.equal(result.serverDecoded, true);
    assert.deepEqual(result.imageBytes, PNG);
    assert.equal(result.imageSha256, createHash("sha256").update(PNG).digest("hex"));
    assert.equal(result.ownerId, "user_clerk_test");
  });
  test("rejects absent request", async () => {
    await expectError(null, "INVALID_REQUEST");
  });
  test("rejects arrays instead of a server request object", async () => {
    await expectError([], "INVALID_REQUEST");
  });
  test("blocks client width, height, serverDecoded and provider switches", async () => {
    for (const extra of [{ width: 2 }, { height: 2 }, { serverDecoded: true }, { enabled: true }, { apiKey: "secret" }]) {
      await expectError({ ...base(), ...extra }, "UNTRUSTED_METADATA");
    }
  });
  test("requires a trusted authenticated owner", async () => {
    for (const ownerId of [null, "", " user_123 ", "user\n123", "a".repeat(201)]) {
      await expectError({ ...base(), ownerId }, "INVALID_OWNER");
    }
  });
  test("requires actual bytes", async () => {
    for (const imageBytes of ["file", [], {}, null]) {
      await expectError({ ...base(), imageBytes }, "INVALID_IMAGE");
    }
  });
  test("rejects images that are too small or too large", async () => {
    for (const imageBytes of [new Uint8Array(11), new Uint8Array(10 * 1024 * 1024 + 1)]) {
      await expectError({ ...base(), imageBytes }, "INVALID_IMAGE_SIZE");
    }
  });
  test("rejects unsupported declared mime types", async () => {
    await expectError({ ...base(), declaredMimeType: "image/svg+xml" }, "INVALID_IMAGE_TYPE");
  });
  test("rejects mime and image signature mismatch", async () => {
    await expectError({ ...base(), declaredMimeType: "image/jpeg" }, "INVALID_IMAGE_SIGNATURE");
  });
  test("rejects fake SVG as PNG before attempting full decode", async () => {
    let calls = 0;
    await expectError({ ...base(), imageBytes: new TextEncoder().encode("<svg>fake</svg>"),
      decodeImage: async () => { calls++; return {}; } }, "INVALID_IMAGE_SIGNATURE");
    assert.equal(calls, 0);
  });
  test("requires an explicitly injected server decoder", async () => {
    await expectError({ ...base(), decodeImage: undefined }, "FULL_DECODER_REQUIRED");
  });
  test("never accepts decoder exceptions as valid images", async () => {
    await expectError({ ...base(), decodeImage: async () => { throw new Error("bad image"); } }, "IMAGE_DECODE_FAILED");
  });
  test("rejects empty decoder output", async () => {
    await expectError({ ...base(), decodeImage: async () => null }, "IMAGE_DECODE_FAILED");
  });
  test("rejects decoded format mismatch", async () => {
    await expectError({ ...base(), decodeImage: fullDecode({ format: "webp" }) }, "FORMAT_MISMATCH");
  });
  test("rejects impossible decoded dimensions before allocating pixels", async () => {
    for (const [width, height] of [[0,2], [8001,1], [6000,6000], [1.5,2]]) {
      await expectError({ ...base(), decodeImage: fullDecode({ width, height }) }, "INVALID_DIMENSIONS");
    }
  });
  test("rejects animations and multipage originals", async () => {
    for (const pages of [0, 2, undefined]) {
      await expectError({ ...base(), decodeImage: async () => ({ format: "png", width: 2, height: 2,
        channels: 4, pages, pixels: new Uint8Array(16) }) }, "MULTIPAGE_BLOCKED");
    }
  });
  test("rejects header-only decoder outputs", async () => {
    await expectError({ ...base(), decodeImage: async () => ({ format: "png", width: 2, height: 2,
      channels: 4, pages: 1 }) }, "INCOMPLETE_DECODE");
  });
  test("requires complete exact-size RGBA pixel buffer", async () => {
    for (const args of [
      { channels: 3 }, { pixels: "fake pixels" },
      { pixels: new Uint8Array(15) }, { pixels: new Uint8Array(17) },
    ]) {
      await expectError({ ...base(), decodeImage: fullDecode(args) }, "INCOMPLETE_DECODE");
    }
  });
  test("supports JPEG and WebP with matching full decode metadata", async () => {
    for (const [imageBytes, declaredMimeType, format] of [
      [JPEG, "image/jpeg", "jpeg"], [WEBP, "image/webp", "webp"],
    ]) {
      const result = await prepareBackgroundRemovalSource({
        ...base(), imageBytes, declaredMimeType, decodeImage: fullDecode({ format }),
      });
      assert.equal(result.mimeType, declaredMimeType);
      assert.equal(result.serverDecoded, true);
    }
  });
  test("copies original input to resist later caller mutations", async () => {
    const provided = new Uint8Array(PNG);
    const result = await prepareBackgroundRemovalSource({ ...base(), imageBytes: provided });
    provided[0] = 0;
    assert.equal(result.imageBytes[0], PNG[0]);
  });
  test("rejects decoder mutation of source before provider boundary", async () => {
    await expectError({ ...base(), decodeImage: async ({ imageBytes }) => {
      imageBytes[0] = 0;
      return { format: "png", width: 2, height: 2, channels: 4,
        pages: 1, pixels: new Uint8Array(16) };
    } }, "SOURCE_MUTATED");
  });
});
