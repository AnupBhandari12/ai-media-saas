import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  BACKGROUND_QUOTA_ENDPOINT,
  BACKGROUND_MAX_IMAGE_BYTES,
  BACKGROUND_MAX_SIDE,
  BACKGROUND_MAX_PIXELS,
  BACKGROUND_PROVIDER_READY,
  backgroundSignatureMatches,
  inspectBackgroundImage,
  validateBackgroundImage,
  validateBackgroundImageDimensions,
  formatBackgroundBytes,
} from "../../lib/ai/aiBackgroundUi.mjs";

const PNG = [137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0];
const JPEG = [255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 0];
const WEBP = [82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80];

function localFile({ type = "image/png", name = "photo.png", bytes = PNG, size = bytes.length } = {}) {
  return {
    type,
    name,
    size,
    slice(_start, end) {
      const chunk = Uint8Array.from(bytes).slice(0, end);
      return { async arrayBuffer() { return chunk.buffer; } };
    },
  };
}

describe("Phase 21 AI-09 browser-only background remover preparation", () => {
  test("uses only the existing read-only quota endpoint", () => {
    assert.equal(BACKGROUND_QUOTA_ENDPOINT, "/api/ai/quota");
  });

  test("provider is explicitly not connected", () => {
    assert.equal(BACKGROUND_PROVIDER_READY, false);
  });

  test("uses a bounded image size", () => {
    assert.equal(BACKGROUND_MAX_IMAGE_BYTES, 10 * 1024 * 1024);
  });

  test("accepts matching PNG filename and type", () => {
    assert.equal(validateBackgroundImage(localFile()).valid, true);
  });

  test("accepts JPEG JPG or JPEG extension", () => {
    for (const name of ["photo.jpg", "photo.jpeg", "PHOTO.JPEG"]) {
      assert.equal(validateBackgroundImage(localFile({ type: "image/jpeg", name, bytes: JPEG })).valid, true);
    }
  });

  test("accepts WebP filename and type", () => {
    assert.equal(validateBackgroundImage(localFile({ type: "image/webp", name: "photo.webp", bytes: WEBP })).valid, true);
  });

  test("rejects SVG, GIF and PDFs by MIME", () => {
    for (const type of ["image/svg+xml", "image/gif", "application/pdf", "text/html", ""]) {
      assert.equal(validateBackgroundImage(localFile({ type })).valid, false);
    }
  });

  test("rejects extension and type mismatch", () => {
    assert.equal(validateBackgroundImage(localFile({ name: "photo.jpg", type: "image/png" })).valid, false);
    assert.equal(validateBackgroundImage(localFile({ name: "photo.png.exe" })).valid, false);
  });

  test("rejects empty, tiny, too-large and invalid byte sizes", () => {
    for (const size of [0, 1, 11, BACKGROUND_MAX_IMAGE_BYTES + 1, NaN, Infinity, 1.5, -1]) {
      assert.equal(validateBackgroundImage(localFile({ size })).valid, false);
    }
  });

  test("accepts maximum allowed file byte count", () => {
    assert.equal(validateBackgroundImage(localFile({ size: BACKGROUND_MAX_IMAGE_BYTES })).valid, true);
  });

  test("rejects missing input and invalid file names", () => {
    for (const file of [null, [], {}, localFile({ name: "" }), localFile({ name: "a".repeat(256) })]) {
      assert.equal(validateBackgroundImage(file).valid, false);
    }
  });

  test("recognizes true PNG magic bytes", () => {
    assert.equal(backgroundSignatureMatches("image/png", Uint8Array.from(PNG)), true);
    assert.equal(backgroundSignatureMatches("image/png", Uint8Array.from(PNG.slice(0, 7))), false);
  });

  test("recognizes true JPEG magic bytes", () => {
    assert.equal(backgroundSignatureMatches("image/jpeg", Uint8Array.from(JPEG)), true);
    assert.equal(backgroundSignatureMatches("image/jpeg", Uint8Array.from([255, 216, 0])), false);
  });

  test("recognizes true WEBP RIFF and WEBP magic bytes", () => {
    assert.equal(backgroundSignatureMatches("image/webp", Uint8Array.from(WEBP)), true);
    const wrong = [...WEBP]; wrong[8] = 65;
    assert.equal(backgroundSignatureMatches("image/webp", Uint8Array.from(wrong)), false);
  });

  test("rejects unsupported or malformed signature arguments", () => {
    assert.equal(backgroundSignatureMatches("application/pdf", Uint8Array.from(PNG)), false);
    assert.equal(backgroundSignatureMatches("image/png", null), false);
    assert.equal(backgroundSignatureMatches("image/png", []), false);
  });

  test("inspects valid PNG, JPEG and WebP file headers locally", async () => {
    assert.equal((await inspectBackgroundImage(localFile())).valid, true);
    assert.equal((await inspectBackgroundImage(localFile({ type: "image/jpeg", name: "x.jpg", bytes: JPEG }))).valid, true);
    assert.equal((await inspectBackgroundImage(localFile({ type: "image/webp", name: "x.webp", bytes: WEBP }))).valid, true);
  });

  test("rejects spoofed image headers", async () => {
    const fake = localFile({ bytes: Array(12).fill(0) });
    assert.match((await inspectBackgroundImage(fake)).error, /signature/i);
  });

  test("fails safely when reading file bytes throws", async () => {
    const fake = localFile();
    fake.slice = () => { throw new Error("disk error"); };
    assert.equal((await inspectBackgroundImage(fake)).valid, false);
  });

  test("rejects missing buffer or array-buffer mismatch", async () => {
    const fake = localFile();
    fake.slice = () => ({ async arrayBuffer() { return "bad"; } });
    assert.equal((await inspectBackgroundImage(fake)).valid, false);
  });

  test("does not read rejected invalid image bytes", async () => {
    const fake = localFile({ name: "spoof.exe" });
    fake.slice = () => { throw new Error("Should not be called"); };
    assert.equal((await inspectBackgroundImage(fake)).valid, false);
  });

  test("accepts reasonable image dimensions", () => {
    assert.equal(validateBackgroundImageDimensions(1200, 1000).valid, true);
    assert.equal(validateBackgroundImageDimensions(4000, 5000).valid, true);
  });

  test("rejects invalid and huge dimensions", () => {
    assert.equal(BACKGROUND_MAX_SIDE, 8000);
    assert.equal(BACKGROUND_MAX_PIXELS, 20_000_000);
    for (const dims of [[0, 600], [8001, 100], [5000, 5000], [Infinity, 500], [5.5, 100], [-2, 100]]) {
      assert.equal(validateBackgroundImageDimensions(...dims).valid, false);
    }
  });

  test("presents safe human-readable file sizes", () => {
    assert.equal(formatBackgroundBytes(1024), "1 KB");
    assert.equal(formatBackgroundBytes(1024 * 1024), "1.00 MB");
    assert.equal(formatBackgroundBytes(-1), "Unknown size");
  });
});
