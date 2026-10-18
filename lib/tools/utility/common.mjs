export const UTILITY_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const UTILITY_MAX_PIXELS = 20_000_000;
export const UTILITY_IMAGE_MIMES = Object.freeze(["image/jpeg", "image/png", "image/webp"]);

export function validateUtilityImage(file, maxBytes = UTILITY_MAX_IMAGE_BYTES) {
  if (!file || !UTILITY_IMAGE_MIMES.includes(file.type) ||
      !Number.isSafeInteger(file.size) || file.size < 8 || file.size > maxBytes) {
    throw new Error("Choose a JPG, PNG or WebP image within the stated size limit.");
  }
  return file;
}
export function safeUtilityFilename(value, extension) {
  const stem = String(value || "utility").replace(/\.[a-z0-9]+$/i, "")
    .normalize("NFKD").replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-")
    .slice(0, 55).replace(/^-|-$/g, "") || "utility";
  if (!/^\.[a-z0-9]+$/.test(extension)) throw new Error("Unsupported file extension.");
  return `${stem}${extension}`;
}
export function assertImageDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || width * height > UTILITY_MAX_PIXELS) {
    throw new Error("Image dimensions exceed the browser safety limit.");
  }
}
export function formatUtilityBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / 1048576).toFixed(2)} MiB`;
}
