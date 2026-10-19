// Phase 21 / 10B: server-only REMOVE.BG transport adapter, not a public route.
// DO NOT import into client components. DO NOT dispatch without a separate
// authenticated, quota-reserved, cost-guarded server endpoint and user approval.
import {
  BACKGROUND_MAX_IMAGE_BYTES,
  BACKGROUND_MAX_PIXELS,
  BACKGROUND_MAX_SIDE,
  backgroundSignatureMatches,
  validateBackgroundImageDimensions,
} from "./aiBackgroundUi.mjs";

export const REMOVE_BG_PROVIDER_ID = "remove.bg";
export const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";
export const REMOVE_BG_MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
export const REMOVE_BG_TIMEOUT_MS = 25_000;
export const REMOVE_BG_CONNECTED_TO_PUBLIC_ROUTE = false;

const MIME_EXTENSION = Object.freeze({
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
});

export class RemoveBgProviderError extends Error {
  constructor(code, message, { dispatched = false, httpStatus = null } = {}) {
    super(message);
    this.name = "RemoveBgProviderError";
    this.code = code;
    // Any request that MAY have reached the vendor is not safe to auto-refund.
    this.dispatched = dispatched;
    this.safeToRefund = !dispatched;
    this.httpStatus = httpStatus;
  }
}

function fail(code, message) {
  throw new RemoveBgProviderError(code, message);
}

export function validateRemoveBgInput({
  imageBytes,
  mimeType,
  width,
  height,
  serverDecoded = false,
} = {}) {
  // This assertion must be set ONLY after decoding the original on the server.
  // Client-supplied width/height/flags are never authoritative.
  if (serverDecoded !== true) {
    fail("SERVER_DECODE_REQUIRED", "A trusted server-side image decode is required.");
  }
  if (!(imageBytes instanceof Uint8Array)) {
    fail("INVALID_IMAGE", "Image data must be bytes.");
  }
  if (
    imageBytes.byteLength < 12 ||
    imageBytes.byteLength > BACKGROUND_MAX_IMAGE_BYTES
  ) {
    fail("INVALID_IMAGE_SIZE", "Image exceeds the 10 MiB input limit.");
  }
  if (!Object.hasOwn(MIME_EXTENSION, mimeType) ||
      !backgroundSignatureMatches(mimeType, imageBytes)) {
    fail("INVALID_IMAGE_TYPE", "Image signature does not match a supported format.");
  }
  const dimensions = validateBackgroundImageDimensions(width, height);
  if (!dimensions.valid || width > BACKGROUND_MAX_SIDE || height > BACKGROUND_MAX_SIDE ||
      width * height > BACKGROUND_MAX_PIXELS) {
    fail("INVALID_IMAGE_DIMENSIONS", "Image dimensions are not allowed.");
  }
  return { mimeType, extension: MIME_EXTENSION[mimeType], width, height, inputBytes: imageBytes.byteLength };
}

function checkPng(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 57 ||
      !backgroundSignatureMatches("image/png", bytes)) {
    fail("INVALID_RESULT", "Provider returned an invalid PNG result.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkName = (index) => String.fromCharCode(...bytes.subarray(index, index + 4));
  if (view.getUint32(8) !== 13 || chunkName(12) !== "IHDR") {
    fail("INVALID_RESULT", "Provider PNG is missing its image header.");
  }
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const colorType = bytes[25];
  const checked = validateBackgroundImageDimensions(width, height);
  if (!checked.valid || ![4, 6].includes(colorType) || ![8, 16].includes(bytes[24])) {
    fail("INVALID_RESULT", "Provider PNG must be a bounded image with an alpha channel.");
  }
  let offset = 8;
  let hasIdat = false;
  let hasEnd = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    // 8-byte chunk header + payload + 4-byte CRC; bound prevents overflow.
    if (length > bytes.length - offset - 12) {
      fail("INVALID_RESULT", "Provider PNG has a truncated chunk.");
    }
    const name = chunkName(offset + 4);
    if (name === "IDAT") hasIdat = true;
    if (name === "IEND") {
      if (length !== 0 || offset + 12 !== bytes.length) {
        fail("INVALID_RESULT", "Provider PNG has an invalid ending.");
      }
      hasEnd = true;
      break;
    }
    offset += length + 12;
  }
  if (!hasIdat || !hasEnd) {
    fail("INVALID_RESULT", "Provider PNG is missing image data or its ending.");
  }
  return { width, height };
}

async function readBoundedPng(response) {
  const type = response.headers?.get?.("content-type")?.split(";")[0]?.trim()?.toLowerCase();
  if (type !== "image/png") {
    throw new RemoveBgProviderError("INVALID_RESULT", "Provider did not return a PNG image.", { dispatched: true });
  }
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > REMOVE_BG_MAX_OUTPUT_BYTES) {
      throw new RemoveBgProviderError("OUTPUT_TOO_LARGE", "Provider PNG exceeds the output limit.", { dispatched: true });
    }
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    throw new RemoveBgProviderError("INVALID_RESULT", "Provider response cannot be streamed safely.", { dispatched: true });
  }
  const reader = response.body.getReader();
  const parts = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) {
        throw new RemoveBgProviderError("INVALID_RESULT", "Provider returned invalid binary chunks.", { dispatched: true });
      }
      total += value.byteLength;
      if (total > REMOVE_BG_MAX_OUTPUT_BYTES) {
        throw new RemoveBgProviderError("OUTPUT_TOO_LARGE", "Provider PNG exceeds the output limit.", { dispatched: true });
      }
      parts.push(value);
    }
  } finally {
    try { await reader.cancel(); } catch { /* response may already be finished */ }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  try {
    const { width, height } = checkPng(bytes);
    return { bytes, width, height };
  } catch (error) {
    if (error instanceof RemoveBgProviderError) {
      throw new RemoveBgProviderError(error.code, error.message, { dispatched: true });
    }
    throw error;
  }
}

export async function runRemoveBgProvider({
  imageBytes,
  mimeType,
  width,
  height,
  serverDecoded = false,
  enabled = false,
  apiKey = process.env.REMOVE_BG_API_KEY,
  fetchFn = fetch,
} = {}) {
  // Default-off even when an API key happens to be present in .env.local.
  if (enabled !== true) {
    fail("DISABLED", "Paid background removal transport is disabled.");
  }
  // Validate before constructing FormData or opening any network connection.
  const checked = validateRemoveBgInput({ imageBytes, mimeType, width, height, serverDecoded });
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    fail("MISSING_API_KEY", "Background removal provider key is not configured.");
  }
  if (typeof fetchFn !== "function") {
    fail("INVALID_TRANSPORT", "Provider transport is unavailable.");
  }
  const body = new FormData();
  body.set("image_file", new Blob([imageBytes], { type: mimeType }), `source.${checked.extension}`);
  body.set("size", "auto");
  body.set("format", "png");
  let response;
  try {
    response = await fetchFn(REMOVE_BG_ENDPOINT, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body,
      signal: AbortSignal.timeout(REMOVE_BG_TIMEOUT_MS),
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    // Network/timeout ambiguity: provider might have accepted the job.
    throw new RemoveBgProviderError("PROVIDER_UNKNOWN", "Background removal outcome is unknown.", { dispatched: true });
  }
  if (!response || typeof response.ok !== "boolean") {
    throw new RemoveBgProviderError("PROVIDER_UNKNOWN", "Background removal outcome is unknown.", { dispatched: true });
  }
  if (!response.ok) {
    const httpStatus = Number.isInteger(response.status) ? response.status : null;
    const code = httpStatus === 402 ? "INSUFFICIENT_PROVIDER_CREDITS" : "PROVIDER_REJECTED";
    // Never echo response body: vendor errors might include secrets/input.
    throw new RemoveBgProviderError(code, "Background removal provider rejected the request.", {
      dispatched: true, httpStatus,
    });
  }
  let output;
  try {
    output = await readBoundedPng(response);
  } catch (error) {
    if (error instanceof RemoveBgProviderError) throw error;
    throw new RemoveBgProviderError("PROVIDER_UNKNOWN", "Background removal result could not be verified.", { dispatched: true });
  }
  return {
    status: "SUCCESS",
    provider: REMOVE_BG_PROVIDER_ID,
    format: "png",
    mimeType: "image/png",
    fileName: "background-removed.png",
    bytes: output.bytes,
    width: output.width,
    height: output.height,
    // Remove.bg uses provider credits; these are NOT OpenAI tokens/USD estimates.
    providerCreditUnits: 1,
    generated: true,
    originalUnchanged: true,
  };
}
