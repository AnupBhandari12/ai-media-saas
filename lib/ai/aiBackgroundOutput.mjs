// Phase 21 / 10E: isolated server-side verification of a returned remove.bg PNG.
// No public route, provider dispatch, quota debit, database or storage write.
// This is a post-provider integrity boundary, NOT authorization to run a paid job.
import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  BACKGROUND_MAX_PIXELS,
  BACKGROUND_MAX_SIDE,
  backgroundSignatureMatches,
  validateBackgroundImageDimensions,
} from "./aiBackgroundUi.mjs";
import { REMOVE_BG_MAX_OUTPUT_BYTES, REMOVE_BG_PROVIDER_ID } from "./aiRemoveBgProvider.mjs";

export const BACKGROUND_OUTPUT_PUBLIC_ROUTE_ENABLED = false;
export const BACKGROUND_OUTPUT_PAID_PROVIDER_ENABLED = false;
export const BACKGROUND_OUTPUT_MAX_PIXELS = Math.min(BACKGROUND_MAX_PIXELS, 8_000_000);

export class BackgroundOutputError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BackgroundOutputError";
    this.code = code;
    // The provider result has ALREADY been obtained; do not auto-refund or retry.
    this.dispatched = true;
    this.safeToRefund = false;
  }
}

function reject(code) {
  // Never propagate libvips or vendor diagnostic text into the application UI.
  throw new BackgroundOutputError(code, "Background removal output could not be verified.");
}

function boundedDimensions(width, height) {
  const checked = validateBackgroundImageDimensions(width, height);
  return checked.valid && width <= BACKGROUND_MAX_SIDE && height <= BACKGROUND_MAX_SIDE &&
    width * height <= BACKGROUND_OUTPUT_MAX_PIXELS;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

// Vendor adapter already checks PNG chunk lengths, but this independent
// boundary also verifies each CRC before trusting bytes from its result object.
const PNG_CRC_TABLE = Uint32Array.from({ length: 256 }, (_, initial) => {
  let crc = initial;
  for (let i = 0; i < 8; i++) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});
function validPngChunks(bytes) {
  if (bytes.byteLength < 57) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let count = 0;
  let hasData = false;
  while (offset + 12 <= bytes.byteLength) {
    const length = view.getUint32(offset);
    if (length > bytes.byteLength - offset - 12) return false;
    const start = offset + 4;
    const end = start + 4 + length;
    const type = String.fromCharCode(...bytes.subarray(start, start + 4));
    if (count++ === 0 && (type !== "IHDR" || length !== 13)) return false;
    if (type === "IDAT") hasData = true;
    let crc = 0xffffffff;
    for (let i = start; i < end; i++) {
      crc = PNG_CRC_TABLE[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    }
    if (((crc ^ 0xffffffff) >>> 0) !== view.getUint32(end)) return false;
    offset = end + 4;
    if (type === "IEND") {
      return length === 0 && hasData && offset === bytes.byteLength;
    }
  }
  return false;
}

/**
 * Validate a successful transport result from 10B against a fully decoded
 * 10C/10D prepared source, then re-encode the returned pixels without metadata.
 * No network, storage, quota, or DB operations occur.
 *
 * Deliberately limit output to 8MP: RGBA decoding can use 4 bytes per pixel
 * plus libvips temporaries. Public-route concurrency still needs review.
 */
export async function verifyBackgroundRemovalOutput({ preparedSource, providerResult } = {}) {
  if (!preparedSource || typeof preparedSource !== "object" || Array.isArray(preparedSource) ||
      preparedSource.preparation !== "FULL_RGBA_DECODED" ||
      preparedSource.serverDecoded !== true ||
      typeof preparedSource.ownerId !== "string" || !preparedSource.ownerId ||
      !(preparedSource.imageBytes instanceof Uint8Array) ||
      !/^[a-f0-9]{64}$/i.test(preparedSource.imageSha256 ?? "") ||
      sha256(preparedSource.imageBytes) !== preparedSource.imageSha256 ||
      !boundedDimensions(preparedSource.width, preparedSource.height) ||
      !["image/png", "image/jpeg", "image/webp"].includes(preparedSource.mimeType) ||
      !backgroundSignatureMatches(preparedSource.mimeType, preparedSource.imageBytes)) {
    reject("UNVERIFIED_SOURCE");
  }
  if (!providerResult || typeof providerResult !== "object" || Array.isArray(providerResult) ||
      providerResult.status !== "SUCCESS" || providerResult.provider !== REMOVE_BG_PROVIDER_ID ||
      providerResult.format !== "png" || providerResult.mimeType !== "image/png" ||
      providerResult.generated !== true || providerResult.originalUnchanged !== true ||
      providerResult.providerCreditUnits !== 1 ||
      !(providerResult.bytes instanceof Uint8Array)) {
    reject("UNVERIFIED_PROVIDER_RESULT");
  }
  const received = new Uint8Array(providerResult.bytes);
  if (received.byteLength < 57 || received.byteLength > REMOVE_BG_MAX_OUTPUT_BYTES ||
      !backgroundSignatureMatches("image/png", received)) {
    reject("INVALID_PNG");
  }
  // Provider width/height must match real decoded pixels, never trusted on their own.
  if (!validPngChunks(received)) reject("INVALID_PNG_STRUCTURE");
  if (!boundedDimensions(providerResult.width, providerResult.height) ||
      providerResult.width > preparedSource.width ||
      providerResult.height > preparedSource.height) {
    reject("INVALID_DIMENSIONS");
  }
  const originalHash = preparedSource.imageSha256;
  const receivedHash = sha256(received);
  let decoded;
  try {
    const options = {
      animated: false,
      pages: 1,
      failOn: "warning",
      limitInputPixels: BACKGROUND_OUTPUT_MAX_PIXELS,
      unlimited: false,
      sequentialRead: true,
    };
    const input = Buffer.from(received);
    const meta = await sharp(input, options).metadata();
    if (meta.format !== "png" || (meta.pages ?? 1) !== 1 ||
        meta.hasAlpha !== true ||
        !boundedDimensions(meta.width, meta.height) ||
        meta.width !== providerResult.width || meta.height !== providerResult.height) {
      reject("INVALID_PNG_STRUCTURE");
    }
    decoded = await sharp(input, options)
      .toColourspace("srgb")
      .ensureAlpha()
      .raw({ depth: "uchar" })
      .toBuffer({ resolveWithObject: true });
    if (decoded.info.width !== meta.width || decoded.info.height !== meta.height ||
        decoded.info.channels !== 4 ||
        decoded.data.byteLength !== meta.width * meta.height * 4) {
      reject("INCOMPLETE_DECODE");
    }
  } catch (error) {
    if (error instanceof BackgroundOutputError) throw error;
    reject("DECODE_FAILED");
  }
  let transparentPixels = 0;
  let visiblePixels = 0;
  const px = decoded.data;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] < 255) transparentPixels++;
    if (px[i] > 0) visiblePixels++;
  }
  if (transparentPixels === 0 || visiblePixels === 0) {
    reject("NO_USABLE_CUTOUT");
  }
  let sanitized;
  try {
    sanitized = await sharp(decoded.data, {
      raw: { width: decoded.info.width, height: decoded.info.height, channels: 4 },
      limitInputPixels: BACKGROUND_OUTPUT_MAX_PIXELS,
    })
      .png({ compressionLevel: 9, palette: false, force: true })
      .toBuffer();
  } catch {
    reject("ENCODE_FAILED");
  }
  if (sanitized.byteLength > REMOVE_BG_MAX_OUTPUT_BYTES ||
      sanitized.byteLength < 57 ||
      !backgroundSignatureMatches("image/png", sanitized)) {
    reject("SANITIZED_OUTPUT_INVALID");
  }
  if (sha256(preparedSource.imageBytes) !== originalHash || sha256(received) !== receivedHash) {
    reject("SOURCE_MUTATED");
  }
  const output = new Uint8Array(sanitized);
  return Object.freeze({
    status: "VERIFIED",
    provider: REMOVE_BG_PROVIDER_ID,
    mimeType: "image/png",
    fileName: "background-removed.png",
    outputBytes: output,
    width: decoded.info.width,
    height: decoded.info.height,
    transparentPixels,
    originalSha256: originalHash,
    outputSha256: sha256(output),
    sanitizedMetadata: true,
    providerCreditUnits: 1,
    // This only means the bytes passed verification, not that storage is done.
    stored: false,
  });
}
