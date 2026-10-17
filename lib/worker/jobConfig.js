// Phase 19B1: job reservations only. Uploaded file bytes are not accepted yet.
export const WORKER_DOCUMENT_TOOL_IDS = [
  "PDF-20",
  "PDF-21",
  "PDF-22",
];

export const WORKER_DOCUMENT_EXTENSIONS = {
  "PDF-20": [".doc", ".docx"],
  "PDF-21": [".ppt", ".pptx"],
  "PDF-22": [".xls", ".xlsx"],
};

export const MAX_WORKER_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_WORKER_JOBS_PER_MONTH = 20;
export const MAX_RECENT_ACTIVE_JOBS = 3;
export const ACTIVE_JOB_WINDOW_MINUTES = 30;

export function getDocumentExtension(filename) {
  if (typeof filename !== "string") return "";
  const index = filename.lastIndexOf(".");
  if (index < 0) return "";
  return filename.slice(index).toLowerCase();
}

export function isAllowedDocumentType(toolId, filename) {
  const extension = getDocumentExtension(filename);
  return (WORKER_DOCUMENT_EXTENSIONS[toolId] || []).includes(extension);
}

// This is the PUBLIC response; never send internal storage refs or stack traces.
export function toPublicWorkerJob(job) {
  const refs = job.inputRefs && typeof job.inputRefs === "object"
    && !Array.isArray(job.inputRefs)
    ? job.inputRefs
    : {};

  return {
    id: job.id,
    toolId: job.toolId,
    status: job.status,
    progress: job.progress,
    stage: typeof refs.stage === "string" ? refs.stage : null,
    filename: typeof refs.filename === "string" ? refs.filename : null,
    expectedBytes: typeof refs.expectedBytes === "number"
      ? refs.expectedBytes
      : null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt ?? null,
  };
}
