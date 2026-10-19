// Phase 21 / AI-09: local preparation only. Not a background removal provider.
export const BACKGROUND_QUOTA_ENDPOINT = "/api/ai/quota";
export const BACKGROUND_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const BACKGROUND_MAX_SIDE = 8000;
export const BACKGROUND_MAX_PIXELS = 20_000_000;
export const BACKGROUND_PROVIDER_READY = false;

const TYPES = Object.freeze({
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
});

export function validateBackgroundImage(file) {
  if (!file || typeof file !== "object" || Array.isArray(file)) {
    return { valid: false, error: "Choose a PNG, JPEG or WebP photo." };
  }
  if (!Object.hasOwn(TYPES, file.type)) {
    return { valid: false, error: "Only PNG, JPEG and WebP are supported. SVG and GIF are blocked." };
  }
  if (!Number.isSafeInteger(file.size) || file.size < 12 || file.size > BACKGROUND_MAX_IMAGE_BYTES) {
    return { valid: false, error: "Choose a photo between 12 bytes and 10 MB." };
  }
  if (typeof file.name !== "string" || file.name.length === 0 || file.name.length > 255) {
    return { valid: false, error: "The image file needs a normal filename." };
  }
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!TYPES[file.type].includes(extension)) {
    return { valid: false, error: "Image filename extension and file type do not match." };
  }
  if (typeof file.slice !== "function") {
    return { valid: false, error: "Unable to inspect this image file." };
  }
  return { valid: true, error: "" };
}

export function backgroundSignatureMatches(type, bytes) {
  if (!(bytes instanceof Uint8Array)) return false;
  if (type === "image/png") {
    const magic = [137, 80, 78, 71, 13, 10, 26, 10];
    return bytes.length >= 8 && magic.every((value, index) => bytes[index] === value);
  }
  if (type === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  }
  if (type === "image/webp") {
    const riff = [82, 73, 70, 70];
    const webp = [87, 69, 66, 80];
    return bytes.length >= 12 && riff.every((value, index) => bytes[index] === value)
      && webp.every((value, index) => bytes[index + 8] === value);
  }
  return false;
}

export async function inspectBackgroundImage(file) {
  const basic = validateBackgroundImage(file);
  if (!basic.valid) return basic;
  try {
    const header = await file.slice(0, 32).arrayBuffer();
    if (!(header instanceof ArrayBuffer) || !backgroundSignatureMatches(file.type, new Uint8Array(header))) {
      return { valid: false, error: "This file does not match a supported image signature." };
    }
    return { valid: true, error: "" };
  } catch {
    return { valid: false, error: "Could not inspect the local image. Try another file." };
  }
}

export function validateBackgroundImageDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    return { valid: false, error: "Unable to decode image dimensions." };
  }
  if (width > BACKGROUND_MAX_SIDE || height > BACKGROUND_MAX_SIDE || width * height > BACKGROUND_MAX_PIXELS) {
    return { valid: false, error: "Image is too large to preview safely (maximum 8,000 pixels per side and 20 MP)." };
  }
  return { valid: true, error: "" };
}

export function formatBackgroundBytes(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "Unknown size";
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

// No exported method uploads or edits an image. A real provider must be introduced
// in its own reviewed commit, with auth, quotas, pricing and independent QA.
