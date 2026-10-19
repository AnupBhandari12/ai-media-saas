import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  BACKGROUND_SHARP_DECODER_PUBLIC_ROUTE_ENABLED,
  BACKGROUND_SHARP_DECODER_PROVIDER_ENABLED,
  BACKGROUND_SHARP_DEPENDENCY_VERSION,
  BackgroundSharpDecodeError,
  decodeBackgroundImageWithSharp,
  prepareBackgroundRemovalSourceWithSharp,
} from "../../lib/ai/aiSharpDecoder.mjs";

const rgba = Buffer.from([
  255, 0, 0, 255, 0, 255, 0, 255,
  0, 0, 255, 255, 255, 255, 0, 255,
]);

async function photo(format = "png", { width = 2, height = 2 } = {}) {
  const pixels = width === 2 && height === 2
    ? rgba
    : Buffer.alloc(width * height * 4, 180);
  const output = sharp(pixels, { raw: { width, height, channels: 4 } });
  return new Uint8Array(await output.toFormat(format).toBuffer());
}

const source = async (format = "png") => ({
  imageBytes: await photo(format),
  mimeType: `image/${format === "jpeg" ? "jpeg" : format}`,
});

async function expectCode(promise, code) {
  await assert.rejects(promise, (error) =>
    error instanceof BackgroundSharpDecodeError && error.code === code &&
    error.dispatched === false && error.safeToRefund === true);
}

describe("Phase 21 / 10D real Sharp server image decoder", () => {
  test("remains entirely disconnected from paid or public routes", () => {
    assert.equal(BACKGROUND_SHARP_DECODER_PUBLIC_ROUTE_ENABLED, false);
    assert.equal(BACKGROUND_SHARP_DECODER_PROVIDER_ENABLED, false);
    assert.equal(BACKGROUND_SHARP_DEPENDENCY_VERSION, "0.34.5");
  });

  test("decodes a REAL PNG to exact 2x2 RGBA pixel bytes", async () => {
    const result = await decodeBackgroundImageWithSharp(await source());
    assert.equal(result.format, "png");
    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
    assert.equal(result.pages, 1);
    assert.equal(result.channels, 4);
    assert.deepEqual(Buffer.from(result.pixels), rgba);
  });

  test("decodes a REAL JPEG to complete opaque RGBA pixels", async () => {
    const result = await decodeBackgroundImageWithSharp(await source("jpeg"));
    assert.equal(result.format, "jpeg");
    assert.equal(result.pixels.length, 16);
    assert.equal(result.channels, 4);
    for (let i = 3; i < result.pixels.length; i += 4) {
      assert.equal(result.pixels[i], 255);
    }
  });

  test("decodes a REAL WebP to complete RGBA pixels", async () => {
    const result = await decodeBackgroundImageWithSharp(await source("webp"));
    assert.equal(result.format, "webp");
    assert.equal(result.pixels.length, 16);
    assert.equal(result.channels, 4);
  });

  test("full 10C intake accepts real-decoded PNG and preserves original bytes", async () => {
    const file = await source();
    const result = await prepareBackgroundRemovalSourceWithSharp({
      ownerId: "user_clerk_test", imageBytes: file.imageBytes,
      declaredMimeType: file.mimeType,
    });
    assert.equal(result.serverDecoded, true);
    assert.equal(result.preparation, "FULL_RGBA_DECODED");
    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
    assert.deepEqual(result.imageBytes, file.imageBytes);
    assert.equal(result.imageSha256, createHash("sha256").update(file.imageBytes).digest("hex"));
  });

  test("full 10C intake accepts real-decoded JPEG and WebP", async () => {
    for (const format of ["jpeg", "webp"]) {
      const file = await source(format);
      const result = await prepareBackgroundRemovalSourceWithSharp({
        ownerId: "user_clerk_test", imageBytes: file.imageBytes,
        declaredMimeType: file.mimeType,
      });
      assert.equal(result.mimeType, file.mimeType);
      assert.equal(result.width, 2);
    }
  });

  test("rejects invalid source values before Sharp processing", async () => {
    for (const imageBytes of [null, "not bytes", [], {}]) {
      await expectCode(decodeBackgroundImageWithSharp({imageBytes, mimeType:"image/png"}), "INVALID_SOURCE");
    }
  });

  test("rejects too small and oversized image byte streams", async () => {
    for (const size of [0, 11, 10 * 1024 * 1024 + 1]) {
      await expectCode(decodeBackgroundImageWithSharp({
        imageBytes: new Uint8Array(size), mimeType: "image/png",
      }), "INVALID_SIZE");
    }
  });

  test("rejects unsupported MIME and wrong declared format", async () => {
    const file = await source("png");
    for (const mimeType of ["image/jpeg", "image/webp", "image/svg+xml", "text/plain"]) {
      await expectCode(decodeBackgroundImageWithSharp({...file, mimeType}), "INVALID_SIGNATURE");
    }
  });

  test("rejects magic-byte spoofed PNG on a full libvips decode", async () => {
    const fake = new Uint8Array(128);
    fake.set([137,80,78,71,13,10,26,10]);
    await expectCode(decodeBackgroundImageWithSharp({imageBytes: fake, mimeType:"image/png"}), "DECODE_FAILED");
  });

  test("rejects real truncated or corrupt PNG", async () => {
    const file = await source("png");
    const truncated = file.imageBytes.slice(0, 32);
    await expectCode(decodeBackgroundImageWithSharp({imageBytes:truncated,mimeType:file.mimeType}), "DECODE_FAILED");
  });

  test("blocks a real image over 8000 pixels on one side", async () => {
    const big = await photo("png", {width:8001, height:1});
    await expectCode(decodeBackgroundImageWithSharp({ imageBytes:big,mimeType:"image/png" }), "INVALID_DIMENSIONS");
  });

  test("rejects a REAL 2-frame animated WebP", async () => {
    // Tiny fixed, locally-encoded two-frame red/blue WebP, no network fixture.
    const animated = new Uint8Array(Buffer.from(
      "UklGRoQAAABXRUJQVlA4WAoAAAACAAAAAQAAAQAAQU5JTQYAAAAAAAAAAABBTk1GKAAAAAAAAAAAAAEAAAEAAGQAAAJWUDhMDwAAAC8BQAAABxD9j/4HIqL/AQBBTk1GKAAAAAAAAAAAAAEAAAEAAGQAAABWUDhMDwAAAC8BQAAABxDR//4HIqL/AQA=",
      "base64"
    ));
    const metadata = await sharp(animated).metadata();
    assert.equal(metadata.pages, 2);
    await expectCode(decodeBackgroundImageWithSharp({
      imageBytes: animated, mimeType: "image/webp",
    }), "MULTIPAGE_BLOCKED");
  });

  test("input Uint8Array can be mutated after call without altering full intake result", async () => {
    const file = await source("png");
    const copy = new Uint8Array(file.imageBytes);
    const result = await prepareBackgroundRemovalSourceWithSharp({
      ownerId:"user_clerk_test",imageBytes:copy,declaredMimeType:"image/png",
    });
    copy[0] = 0;
    assert.equal(result.imageBytes[0],137);
  });

  test("intake still rejects client dimensions and provider flags", async () => {
    const file = await source();
    const valid = {ownerId:"user_clerk_test",imageBytes:file.imageBytes,declaredMimeType:file.mimeType};
    for (const key of ["width","height","serverDecoded","apiKey","enabled","decodeImage"]) {
      await expectCode(prepareBackgroundRemovalSourceWithSharp({...valid,[key]:1}), "UNTRUSTED_METADATA");
    }
  });
});
