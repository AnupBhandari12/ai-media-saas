export const OCR_IMAGE_LANGUAGES = Object.freeze({
  eng: { label: "English", languages: "eng" },
  nep: { label: "Nepali", languages: "nep" },
  "eng+nep": { label: "English + Nepali", languages: ["eng", "nep"] },
});
export function validateOcrLanguage(value) {
  const config = OCR_IMAGE_LANGUAGES[value];
  if (!config) throw new Error("Choose a supported OCR language.");
  return config;
}
export function normalizeOcrProgress(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n * 100))) : 0;
}
export function cleanOcrText(value) { return String(value || "").replace(/\r\n?/g, "\n").trim(); }
