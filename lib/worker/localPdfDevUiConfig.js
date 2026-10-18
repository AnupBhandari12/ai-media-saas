// Public browser constants only; does not contain bridge secrets.
export const DEV_PDF_BRIDGE = "http://127.0.0.1:4847";
export const DEV_PDF_MAX_BYTES = 25 * 1024 * 1024;
export const DEV_PDF_UI = Object.freeze({
  "PDF-12": {
    toolId: "PDF-12", operation: "compress-target", title: "Compress PDF to Target Size",
    description: "Best-effort compression through your private local Docker worker.",
    action: "Compress PDF", outputSuffix: "-target.pdf",
  },
  "PDF-15": {
    toolId: "PDF-15", operation: "protect", title: "Protect PDF with Password",
    description: "Encrypt a PDF with 256-bit encryption using your private local Docker worker.",
    action: "Protect PDF", outputSuffix: "-protected.pdf",
  },
  "PDF-30": {
    toolId: "PDF-30", operation: "repair", title: "Repair / Normalize PDF",
    description: "Try to reconstruct an accessible PDF without overwriting the original. Best effort only.",
    action: "Repair / Normalize PDF", outputSuffix: "-normalized.pdf",
  },
  "PDF-16": {
    toolId: "PDF-16", operation: "unlock", title: "Unlock PDF with Known Password",
    description: "Decrypt only PDFs you own or are authorized to open with a known password.",
    action: "Unlock PDF", outputSuffix: "-unlocked.pdf",
  },
});

export function validateDevPdfSelection(file) {
  if (!file || typeof file.name !== "string" ||
      !Number.isInteger(file.size) || file.size < 8 || file.size > DEV_PDF_MAX_BYTES ||
      file.name.length > 180 || !/\.pdf$/i.test(file.name) ||
      /[\\/\x00-\x1f\x7f]/.test(file.name) || file.name.includes("..")) {
    return "Choose one ordinary PDF (8 bytes–25 MiB) with a valid .pdf filename.";
  }
  return null;
}

export function makeDevPdfDownloadName(filename, suffix) {
  const stem = filename.replace(/\.pdf$/i, "").replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 70) || "document";
  return `${stem}${suffix}`;
}
