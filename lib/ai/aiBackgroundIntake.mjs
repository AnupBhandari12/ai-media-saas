// Phase 21 / 10C: server-only, side-effect-free full-decode handoff.
// Not a route, no paid call, no quota debit, no database or media writes.
// The ONLY trusted decoder is an explicitly injected server-side implementation
// that produces actual RGBA pixel bytes, not merely width/height metadata.
import { createHash } from "node:crypto";
import {
  BACKGROUND_MAX_IMAGE_BYTES,
  BACKGROUND_MAX_PIXELS,
  BACKGROUND_MAX_SIDE,
  backgroundSignatureMatches,
  validateBackgroundImageDimensions,
} from "./aiBackgroundUi.mjs";
import { validateRemoveBgInput } from "./aiRemoveBgProvider.mjs";

export const BACKGROUND_INTAKE_CONNECTED_TO_ROUTE = false;
export const BACKGROUND_INTAKE_PROVIDER_ENABLED = false;
export const BACKGROUND_INTAKE_RGBA_CHANNELS = 4;

const MIME_FORMATS = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/webp": "webp",
});
const ALLOWED_FIELDS = new Set(["ownerId", "imageBytes", "declaredMimeType", "decodeImage"]);

export class BackgroundIntakeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "BackgroundIntakeError";
    this.code = code;
    this.dispatched = false;
    this.safeToRefund = true;
  }
}

function reject(code, message) {
  throw new BackgroundIntakeError(code, message);
}

function validateOwner(ownerId) {
  if (
    typeof ownerId !== "string" ||
    ownerId.length === 0 ||
    ownerId.length > 200 ||
    ownerId !== ownerId.trim() ||
    Array.from(ownerId).some((char) => {
      const code = char.codePointAt(0);
      return code < 32 || code === 127;
    })
  ) {
    reject("INVALID_OWNER", "An authenticated server-side owner ID is required.");
  }
}

function getMimeTypeFromSignature(bytes) {
  if (backgroundSignatureMatches("image/png", bytes)) return "image/png";
  if (backgroundSignatureMatches("image/jpeg", bytes)) return "image/jpeg";
  if (backgroundSignatureMatches("image/webp", bytes)) return "image/webp";
  return null;
}

/**
 * Requires an INTERNAL server-created decodeImage function that fully decodes
 * the original image into RGBA (width * height * 4) bytes. A HEADERS-ONLY
 * metadata parser is NOT sufficient. No route calls this function yet.
 *
 * Do not pass request JSON keys (such as width/height/serverDecoded) into this
 * boundary. The only provenance of dimensions is the trusted decoder output.
 */
export async function prepareBackgroundRemovalSource(options = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    reject("INVALID_REQUEST", "Invalid server image preparation arguments.");
  }
  for (const key of Object.keys(options)) {
    if (!ALLOWED_FIELDS.has(key)) {
      reject("UNTRUSTED_METADATA", "Client image metadata cannot authorize processing.");
    }
  }
  const { ownerId, imageBytes, declaredMimeType, decodeImage } = options;
  validateOwner(ownerId);
  if (!(imageBytes instanceof Uint8Array)) {
    reject("INVALID_IMAGE", "Source image must be raw bytes.");
  }
  if (imageBytes.byteLength < 12 || imageBytes.byteLength > BACKGROUND_MAX_IMAGE_BYTES) {
    reject("INVALID_IMAGE_SIZE", "Source image exceeds the image byte limit.");
  }
  if (!Object.hasOwn(MIME_FORMATS, declaredMimeType)) {
    reject("INVALID_IMAGE_TYPE", "Only PNG, JPEG and WebP are supported.");
  }
  if (typeof decodeImage !== "function") {
    reject("FULL_DECODER_REQUIRED", "A trusted server-side full image decoder is required.");
  }

  const verifiedMimeType = getMimeTypeFromSignature(imageBytes);
  if (!verifiedMimeType || verifiedMimeType !== declaredMimeType) {
    reject("INVALID_IMAGE_SIGNATURE", "Image signature does not match the declared type.");
  }

  // Isolate the prepared source from later caller modifications.
  const source = new Uint8Array(imageBytes);
  const sha256 = createHash("sha256").update(source).digest("hex");
  let decoded;
  try {
    // The injected decoder must actually decode the FULL pixel payload. 10D
    // will wire a separately reviewed, bounded Sharp implementation here.
    decoded = await decodeImage({ imageBytes: source, mimeType: verifiedMimeType });
  } catch {
    reject("IMAGE_DECODE_FAILED", "The image could not be fully decoded on the server.");
  }
  if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) {
    reject("IMAGE_DECODE_FAILED", "The full image decoder returned invalid data.");
  }
  const { format, width, height, channels, pixels, pages } = decoded;
  if (format !== MIME_FORMATS[verifiedMimeType]) {
    reject("FORMAT_MISMATCH", "Decoded image format does not match the original.");
  }
  const dimensions = validateBackgroundImageDimensions(width, height);
  if (
    !dimensions.valid ||
    width > BACKGROUND_MAX_SIDE || height > BACKGROUND_MAX_SIDE ||
    width * height > BACKGROUND_MAX_PIXELS
  ) {
    reject("INVALID_DIMENSIONS", "Decoded image dimensions exceed the supported limit.");
  }
  if (pages !== 1) {
    reject("MULTIPAGE_BLOCKED", "Animated or multipage images are unsupported.");
  }
  const expectedBytes = width * height * BACKGROUND_INTAKE_RGBA_CHANNELS;
  if (
    channels !== BACKGROUND_INTAKE_RGBA_CHANNELS ||
    !(pixels instanceof Uint8Array) ||
    pixels.byteLength !== expectedBytes
  ) {
    reject("INCOMPLETE_DECODE", "The complete RGBA pixel payload is required.");
  }

  // Fail closed if an injected decoder unexpectedly mutated the original.
  const afterward = createHash("sha256").update(source).digest("hex");
  if (afterward !== sha256) {
    reject("SOURCE_MUTATED", "Server decoding unexpectedly changed original bytes.");
  }

  // Match 10B's own bounds and type guards without making any provider call.
  validateRemoveBgInput({
    imageBytes: source,
    mimeType: verifiedMimeType,
    width,
    height,
    serverDecoded: true,
  });

  return Object.freeze({
    ownerId,
    imageBytes: source,
    mimeType: verifiedMimeType,
    width,
    height,
    imageSha256: sha256,
    serverDecoded: true,
    // Provenance describes the full decode contract only; it never enables
    // a provider or authorizes a quota debit by itself.
    preparation: "FULL_RGBA_DECODED",
  });
}
