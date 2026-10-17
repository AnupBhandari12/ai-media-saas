// Browser-safe, deterministic configuration for the local-dev Office -> PDF UI.
// Keep this file free of secrets and server-only storage dependencies.

export const OFFICE_UI_MAX_BYTES = 25 * 1024 * 1024;

export const OFFICE_UI_TOOLS = Object.freeze({
  "PDF-20": {
    toolId: "PDF-20",
    title: "Word to PDF",
    description: "Convert DOC or DOCX documents to PDF with the private document worker.",
    accept: ".doc,.docx",
    allowedExtensions: [".doc", ".docx"],
    label: "Word document",
  },
  "PDF-21": {
    toolId: "PDF-21",
    title: "PowerPoint to PDF",
    description: "Convert PPT or PPTX presentations to PDF with the private document worker.",
    accept: ".ppt,.pptx",
    allowedExtensions: [".ppt", ".pptx"],
    label: "PowerPoint presentation",
  },
  "PDF-22": {
    toolId: "PDF-22",
    title: "Excel to PDF",
    description: "Convert XLS or XLSX spreadsheets to PDF with the private document worker.",
    accept: ".xls,.xlsx",
    allowedExtensions: [".xls", ".xlsx"],
    label: "Excel spreadsheet",
  },
});

export function getOfficeUiTool(toolId) {
  return OFFICE_UI_TOOLS[toolId] ?? null;
}

export function validateOfficeSelection(toolId, file) {
  const config = getOfficeUiTool(toolId);
  if (!config) return "Unknown Office conversion tool.";
  if (!file || typeof file.name !== "string" ||
      !Number.isInteger(file.size) || file.size < 1) {
    return "Choose a non-empty document first.";
  }
  if (file.name.length > 180 || file.name.length < 5 ||
      /[\\/\x00-\x1f\x7f]/.test(file.name) || file.name.includes("..")) {
    return "Invalid filename. Rename the document and try again.";
  }
  const lower = file.name.toLowerCase();
  if (!config.allowedExtensions.some((ext) => lower.endsWith(ext))) {
    return `Choose a ${config.accept} file for this tool.`;
  }
  if (file.size > OFFICE_UI_MAX_BYTES) {
    return "File must be 25 MiB or smaller.";
  }
  return null;
}

export function canCancelOfficeJob(job) {
  return Boolean(job?.status === "PENDING" &&
    ["AWAITING_UPLOAD", "UPLOADING", "READY_FOR_PROCESSING"].includes(job.stage));
}

export function getOfficeJobMessage(job) {
  if (!job) return "Select a document to begin.";
  if (job.status === "COMPLETED") return "Your PDF is ready. Download it while the result is available.";
  if (job.status === "FAILED") return "Conversion failed. Try a different document or contact support.";
  if (job.status === "CANCELLED") return "This job was cancelled.";
  if (job.status === "PROCESSING") return "Docker is converting your document. This can take some time.";
  if (job.stage === "READY_FOR_PROCESSING") return "Upload verified. Waiting for the local developer worker to run.";
  if (job.stage === "UPLOADING") return "Upload started. Complete the upload or retry it.";
  return "Job reserved. Upload the file to continue.";
}

export function formatOfficeBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
