import path from "node:path";

const OFFICE_EXTENSIONS = new Set([
  ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
]);
const MAX_FILENAME_LENGTH = 100;
export const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export function validateWorkerRequest(action, filename) {
  if (action === "health") return { action: "health" };

  if (!["check", "convert", "protect", "unlock"].includes(action)) {
    throw new Error("Unsupported worker operation.");
  }

  if (typeof filename !== "string" ||
      filename.length > MAX_FILENAME_LENGTH ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(filename) ||
      filename.includes("..") || path.basename(filename) !== filename) {
    throw new Error("Invalid input filename.");
  }

  const extension = path.extname(filename).toLowerCase();
  if (action === "check" && extension !== ".pdf") {
    throw new Error("PDF check requires a .pdf file.");
  }
  if (action === "protect" && extension !== ".pdf") {
    throw new Error("PDF protection requires a .pdf file.");
  }
  if (action === "unlock" && extension !== ".pdf") {
    throw new Error("PDF unlock requires a .pdf file.");
  }
  if (action === "convert" && !OFFICE_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported Office file extension.");
  }

  return {
    action,
    filename,
    extension,
    outputFilename:
      action === "convert"
        ? `${filename.slice(0, -extension.length)}.pdf`
        : action === "protect"
          ? `${filename.slice(0, -extension.length)}-protected.pdf`
          : action === "unlock"
            ? `${filename.slice(0, -extension.length)}-unlocked.pdf`
            : null,
  };
}
