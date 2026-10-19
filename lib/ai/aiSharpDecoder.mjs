// Phase 21 / 10D: isolated server-only, bounded Sharp full-pixel decoder.
// NO route, provider call, quota change or DB write is connected here.
// Call only with server-validated original bytes, never browser dimensions.
import sharp from "sharp";
import {
  BACKGROUND_MAX_IMAGE_BYTES,
  BACKGROUND_MAX_PIXELS,
  BACKGROUND_MAX_SIDE,
  backgroundSignatureMatches,
  validateBackgroundImageDimensions,
} from "./aiBackgroundUi.mjs";
import { prepareBackgroundRemovalSource } from "./aiBackgroundIntake.mjs";

export const BACKGROUND_SHARP_DECODER_PUBLIC_ROUTE_ENABLED = false;
export const BACKGROUND_SHARP_DECODER_PROVIDER_ENABLED = false;
export const BACKGROUND_SHARP_DEPENDENCY_VERSION = "0.34.5";

const FORMAT_BY_MIME = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
});

export class BackgroundSharpDecodeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BackgroundSharpDecodeError";
    this.code = code;
    this.dispatched = false;
    this.safeToRefund = true;
  }
}

function reject(code, message) {
  throw new BackgroundSharpDecodeError(code, message);
}

function validDimensions(width, height) {
  return validateBackgroundImageDimensions(width, height).valid &&
    width <= BACKGROUND_MAX_SIDE && height <= BACKGROUND_MAX_SIDE &&
    width * height <= BACKGROUND_MAX_PIXELS;
}

/**
 * Fully decode actual pixels into RGBA using libvips (Sharp), with hard bounds.
 * The caller (10C intake) keeps ownership, mime and immutability checks.
 * This function makes NO external calls and writes NO files or database rows.
 *
 * The 20MP cap can still produce an ~80MB raw buffer. Keep this OFF public
 * routes until deployment memory and request concurrency are reviewed.
 */
export async function decodeBackgroundImageWithSharp({ imageBytes, mimeType } = {}) {
  if (!(imageBytes instanceof Uint8Array)) {
    reject("INVALID_SOURCE", "Image source must be bytes.");
  }
  if (imageBytes.byteLength < 12 || imageBytes.byteLength > BACKGROUND_MAX_IMAGE_BYTES) {
    reject("INVALID_SIZE", "Image source exceeds the permitted byte size.");
  }
  if (!Object.hasOwn(FORMAT_BY_MIME, mimeType) ||
      !backgroundSignatureMatches(mimeType, imageBytes)) {
    reject("INVALID_SIGNATURE", "Unsupported or mismatched image source.");
  }
  // Copy input so a later mutation of caller-owned bytes cannot affect decode.
  const inputBuffer = Buffer.from(imageBytes);
  const sharpOptions = {
    animated: false,
    pages: 1,
    failOn: "warning",
    limitInputPixels: BACKGROUND_MAX_PIXELS,
    unlimited: false,
    sequentialRead: true,
  };

  try {
    const probe = sharp(inputBuffer, sharpOptions);
    // Sharp metadata() is only a pre-flight resource/frame check: it does
    // NOT count as decoding; actual .raw().toBuffer() follows below.
    const meta = await probe.metadata();
    if (meta.format !== FORMAT_BY_MIME[mimeType]) {
      reject("FORMAT_MISMATCH", "Decoded source format does not match declared MIME type.");
    }
    if (!validDimensions(meta.width, meta.height)) {
      reject("INVALID_DIMENSIONS", "Image dimensions exceed the supported limit.");
    }
    const pages = meta.pages ?? 1;
    if (pages !== 1) {
      reject("MULTIPAGE_BLOCKED", "Animated or multipage originals are unsupported.");
    }

    // Fresh pipeline, actual full decode. No resize, no file output, no metadata kept.
    const { data, info } = await sharp(inputBuffer, sharpOptions)
      .toColourspace("srgb")
      .ensureAlpha()
      .raw({ depth: "uchar" })
      .toBuffer({ resolveWithObject: true });
    if (!validDimensions(info.width, info.height) ||
        info.width !== meta.width || info.height !== meta.height ||
        info.channels !== 4 ||
        data.byteLength !== info.width * info.height * 4) {
      reject("INCOMPLETE_DECODE", "Image did not decode to complete RGBA pixels.");
    }

    return {
      format: meta.format,
      width: info.width,
      height: info.height,
      channels: 4,
      pages: 1,
      pixels: new Uint8Array(data),
    };
  } catch (error) {
    if (error instanceof BackgroundSharpDecodeError) throw error;
    // Sharp/libvips messages may contain user-controlled details; do not echo.
    reject("DECODE_FAILED", "Could not safely decode this image.");
  }
}

/**
 * Server-only convenience wrapper: 10C identity/format validation + 10D real
 * decoder. Not wired to routes or paid provider. Original bytes are preserved.
 */
export async function prepareBackgroundRemovalSourceWithSharp(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    reject("INVALID_REQUEST", "Invalid image intake options.");
  }
  for (const key of Object.keys(options)) {
    if (!["ownerId", "imageBytes", "declaredMimeType"].includes(key)) {
      reject("UNTRUSTED_METADATA", "Untrusted fields cannot authorize image processing.");
    }
  }
  return prepareBackgroundRemovalSource({
    ownerId: options.ownerId,
    imageBytes: options.imageBytes,
    declaredMimeType: options.declaredMimeType,
    decodeImage: decodeBackgroundImageWithSharp,
  });
}
