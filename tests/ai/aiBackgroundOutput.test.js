import { describe, test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { prepareBackgroundRemovalSourceWithSharp } from "../../lib/ai/aiSharpDecoder.mjs";
import { REMOVE_BG_MAX_OUTPUT_BYTES } from "../../lib/ai/aiRemoveBgProvider.mjs";
import {
  BACKGROUND_OUTPUT_PUBLIC_ROUTE_ENABLED,
  BACKGROUND_OUTPUT_PAID_PROVIDER_ENABLED,
  BACKGROUND_OUTPUT_MAX_PIXELS,
  BackgroundOutputError,
  verifyBackgroundRemovalOutput,
} from "../../lib/ai/aiBackgroundOutput.mjs";

const width = 2;
const height = 2;
const originalRgba = Buffer.from([
  215, 0, 0, 255, 0, 180, 0, 255,
  0, 0, 210, 255, 240, 240, 20, 255,
]);
const cutoutRgba = Buffer.from([
  215, 0, 0, 255, 0, 180, 0, 0,
  0, 0, 210, 80, 240, 240, 20, 255,
]);
async function pixelsPng(pixels = cutoutRgba, metadata = false) {
  let pipe = sharp(Buffer.from(pixels), { raw: { width, height, channels: 4 } });
  if (metadata) pipe = pipe.withMetadata({ density: 300 });
  return new Uint8Array(await pipe.png().toBuffer());
}
async function source(mimeType = "image/png") {
  const format = mimeType.replace("image/", "");
  const bytes = new Uint8Array(await sharp(originalRgba, {
    raw: { width, height, channels: 4 },
  }).toFormat(format).toBuffer());
  return prepareBackgroundRemovalSourceWithSharp({
    ownerId: "test_user",
    imageBytes: bytes,
    declaredMimeType: mimeType,
  });
}
async function providerResult(overrides = {}) {
  return {
    status: "SUCCESS", provider: "remove.bg", format: "png", mimeType: "image/png",
    bytes: await pixelsPng(), width, height, generated: true,
    originalUnchanged: true, providerCreditUnits: 1,
    ...overrides,
  };
}
function digest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
async function reject(options, code) {
  await assert.rejects(() => verifyBackgroundRemovalOutput(options), error =>
    error instanceof BackgroundOutputError && error.code === code &&
    error.dispatched === true && error.safeToRefund === false &&
    !error.message.includes("libvips") && !error.message.includes("secret"));
}

describe("Phase 21 / 10E safe background output verification", () => {
  test("remains off all public routes and paid-provider dispatch", () => {
    assert.equal(BACKGROUND_OUTPUT_PUBLIC_ROUTE_ENABLED, false);
    assert.equal(BACKGROUND_OUTPUT_PAID_PROVIDER_ENABLED, false);
    assert.equal(BACKGROUND_OUTPUT_MAX_PIXELS, 8_000_000);
  });
  test("accepts a genuinely transparent full-decoded PNG and sanitizes it", async () => {
    const preparedSource = await source();
    const result = await verifyBackgroundRemovalOutput({ preparedSource, providerResult: await providerResult() });
    assert.equal(result.status, "VERIFIED");
    assert.equal(result.provider, "remove.bg");
    assert.equal(result.mimeType, "image/png");
    assert.equal(result.stored, false);
    assert.equal(result.sanitizedMetadata, true);
    assert.equal(result.transparentPixels, 2);
    assert.equal(result.width, 2);
    assert.equal(result.height, 2);
    assert.equal(result.providerCreditUnits, 1);
    assert.equal(result.outputSha256, digest(result.outputBytes));
    assert.equal(result.originalSha256, preparedSource.imageSha256);
    const decoded = await sharp(result.outputBytes).raw().toBuffer({ resolveWithObject: true });
    assert.equal(decoded.info.channels, 4);
    assert.deepEqual(decoded.data, cutoutRgba);
  });
  test("never mutates original or provider result input bytes", async () => {
    const preparedSource = await source();
    const returned = await providerResult();
    const original = new Uint8Array(preparedSource.imageBytes);
    const vendorBytes = new Uint8Array(returned.bytes);
    const verified = await verifyBackgroundRemovalOutput({ preparedSource, providerResult: returned });
    assert.deepEqual(preparedSource.imageBytes, original);
    assert.deepEqual(returned.bytes, vendorBytes);
    verified.outputBytes[0] = 0;
    assert.deepEqual(returned.bytes, vendorBytes);
  });
  test("works for JPEG original with a returned PNG", async () => {
    const result = await verifyBackgroundRemovalOutput({
      preparedSource: await source("image/jpeg"), providerResult: await providerResult(),
    });
    assert.equal(result.status, "VERIFIED");
  });
  test("works for WebP original with a returned PNG", async () => {
    const result = await verifyBackgroundRemovalOutput({
      preparedSource: await source("image/webp"), providerResult: await providerResult(),
    });
    assert.equal(result.status, "VERIFIED");
  });
  test("rejects missing source or result", async () => {
    await reject({ providerResult: await providerResult() }, "UNVERIFIED_SOURCE");
    await reject({ preparedSource: await source() }, "UNVERIFIED_PROVIDER_RESULT");
  });
  test("rejects mismatched source sha256", async () => {
    await reject({ preparedSource: { ...(await source()), imageSha256: "a".repeat(64) }, providerResult: await providerResult() }, "UNVERIFIED_SOURCE");
  });
  test("rejects source mutated after preparation", async () => {
    const preparedSource = await source();
    preparedSource.imageBytes[30] ^= 1;
    await reject({ preparedSource, providerResult: await providerResult() }, "UNVERIFIED_SOURCE");
  });
  test("rejects pretend source provenance", async () => {
    const preparedSource = { ...(await source()), serverDecoded: false };
    await reject({ preparedSource, providerResult: await providerResult() }, "UNVERIFIED_SOURCE");
  });
  test("rejects fake vendor success status", async () => {
    await reject({ preparedSource: await source(), providerResult: await providerResult({ status: "MOCK_ONLY" }) }, "UNVERIFIED_PROVIDER_RESULT");
  });
  test("rejects wrong provider and credit count", async () => {
    await reject({ preparedSource: await source(), providerResult: await providerResult({ provider: "unknown" }) }, "UNVERIFIED_PROVIDER_RESULT");
    await reject({ preparedSource: await source(), providerResult: await providerResult({ providerCreditUnits: 2 }) }, "UNVERIFIED_PROVIDER_RESULT");
  });
  test("rejects no bytes and oversized output without decoding", async () => {
    await reject({ preparedSource: await source(), providerResult: await providerResult({ bytes: null }) }, "UNVERIFIED_PROVIDER_RESULT");
    await reject({ preparedSource: await source(), providerResult: await providerResult({ bytes: new Uint8Array(REMOVE_BG_MAX_OUTPUT_BYTES + 1) }) }, "INVALID_PNG");
  });
  test("rejects a non-PNG mime and magic signature", async () => {
    await reject({ preparedSource: await source(), providerResult: await providerResult({ mimeType: "image/jpeg" }) }, "UNVERIFIED_PROVIDER_RESULT");
    await reject({ preparedSource: await source(), providerResult: await providerResult({ bytes: new Uint8Array(100) }) }, "INVALID_PNG");
  });
  test("rejects a forged width/height before decoding", async () => {
    await reject({ preparedSource: await source(), providerResult: await providerResult({ width: 100 }) }, "INVALID_DIMENSIONS");
  });
  test("rejects claimed vendor dimensions which disagree with actual PNG", async () => {
    await reject({ preparedSource: await source(), providerResult: await providerResult({ width: 1, height: 2 }) }, "INVALID_PNG_STRUCTURE");
  });
  test("rejects header-only or corrupt PNG even if signature is valid", async () => {
    const valid = (await providerResult()).bytes;
    const damaged = new Uint8Array(valid);
    damaged[damaged.length - 12] ^= 0xff;
    await reject({ preparedSource: await source(), providerResult: await providerResult({ bytes: damaged }) }, "INVALID_PNG_STRUCTURE");
  });
  test("rejects a fully opaque PNG: alpha channel is not removal", async () => {
    await reject({ preparedSource: await source(), providerResult: await providerResult({ bytes: await pixelsPng(originalRgba) }) }, "NO_USABLE_CUTOUT");
  });
  test("rejects a fully transparent PNG: subject disappeared", async () => {
    const blank = Buffer.alloc(cutoutRgba.length);
    await reject({ preparedSource: await source(), providerResult: await providerResult({ bytes: await pixelsPng(blank) }) }, "NO_USABLE_CUTOUT");
  });
  test("removes incidental PNG metadata during safe re-encoding", async () => {
    const output = await pixelsPng(cutoutRgba, true);
    const before = await sharp(output).metadata();
    assert.equal(before.density, 300);
    const result = await verifyBackgroundRemovalOutput({ preparedSource: await source(), providerResult: await providerResult({ bytes: output }) });
    const after = await sharp(result.outputBytes).metadata();
    assert.notEqual(after.density, 300);
    assert.equal(after.exif, undefined);
    assert.equal(result.sanitizedMetadata, true);
  });
});
