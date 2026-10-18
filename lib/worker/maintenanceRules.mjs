// Phase 19B5 — pure, dependency-free safety and retention decisions.
// Development-only until a hosted worker, observability and backup policy exist.
export const TEMP_RETENTION_MS = 72 * 60 * 60 * 1000; // 3 days
export const RESULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_CLEANUP_JOBS = 50;
const OFFICE_EXT = "(?:doc|docx|ppt|pptx|xls|xlsx)";
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function assertDevOwner(env = process.env) {
  if (env.NODE_ENV === "production" || env.VERCEL) {
    throw new Error("Local document maintenance is disabled in hosted/production runtimes.");
  }
  for (const key of ["WORKER_JOBS_ENABLED", "WORKER_UPLOADS_ENABLED", "WORKER_EXECUTION_ENABLED"]) {
    if (env[key] !== "true") throw new Error(`Local worker requires ${key}=true.`);
  }
  const ownerId = env.WORKER_DEV_OWNER_ID;
  if (typeof ownerId !== "string" || !/^user_[A-Za-z0-9]{8,80}$/.test(ownerId)) {
    throw new Error("Set WORKER_DEV_OWNER_ID to your Clerk development user ID (user_...).");
  }
  return ownerId;
}

export function assertAutoDispatchEnabled(env = process.env) {
  const ownerId = assertDevOwner(env);
  if (env.WORKER_AUTO_DISPATCH_ENABLED !== "true") {
    throw new Error("Set WORKER_AUTO_DISPATCH_ENABLED=true to opt in to local automatic execution.");
  }
  return ownerId;
}

export function assertCleanupAllowed(env = process.env, apply = false) {
  const ownerId = assertDevOwner(env);
  if (apply && env.WORKER_CLEANUP_ENABLED !== "true") {
    throw new Error("Set WORKER_CLEANUP_ENABLED=true before applying deletion.");
  }
  return ownerId;
}

export function isOldEnough(date, nowMs, ttlMs) {
  const timestamp = new Date(date ?? "").getTime();
  return Number.isFinite(timestamp) && timestamp > 0 && nowMs - timestamp >= ttlMs;
}

export function isResultExpired(job, nowMs = Date.now()) {
  return job?.status === "COMPLETED" &&
    isOldEnough(job.completedAt, nowMs, RESULT_RETENTION_MS);
}

export function safeWorkerKey(jobId, kind, key) {
  if (typeof jobId !== "string" || !/^c[a-z0-9]{10,60}$/.test(jobId) || typeof key !== "string") return false;
  const suffix = kind === "result" ? "pdf" : OFFICE_EXT;
  const prefix = kind === "result" ? "results" : kind === "upload" ? "uploads" : kind === "verified" ? "verified" : null;
  if (!prefix) return false;
  return new RegExp(`^${prefix}/${jobId}/${UUID}\\.${suffix}$`).test(key);
}

export function makeCleanupPlan(job, nowMs = Date.now()) {
  const empty = { expirePending: false, keys: [], expireResult: false };
  if (!job || typeof job !== "object" || !/^c[a-z0-9]{10,60}$/.test(job.id ?? "")) return empty;
  const refs = job.inputRefs && typeof job.inputRefs === "object" && !Array.isArray(job.inputRefs) ? job.inputRefs : {};
  const results = job.resultRefs && typeof job.resultRefs === "object" && !Array.isArray(job.resultRefs) ? job.resultRefs : {};
  const stalePending = job.status === "PENDING" &&
    ["AWAITING_UPLOAD", "UPLOADING"].includes(refs.stage) &&
    isOldEnough(job.createdAt, nowMs, TEMP_RETENTION_MS) &&
    isOldEnough(job.updatedAt, nowMs, TEMP_RETENTION_MS);
  const staleTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(job.status) &&
    isOldEnough(job.completedAt, nowMs, TEMP_RETENTION_MS);
  if (!stalePending && !staleTerminal) return empty;

  const keys = [];
  if (safeWorkerKey(job.id, "upload", refs.storageKey)) keys.push({ kind: "upload", key: refs.storageKey });
  if (staleTerminal && safeWorkerKey(job.id, "verified", refs.verifiedKey)) keys.push({ kind: "verified", key: refs.verifiedKey });
  const expireResult = isResultExpired(job, nowMs) && results.expired !== true;
  if (expireResult && safeWorkerKey(job.id, "result", results.storageKey)) {
    keys.push({ kind: "result", key: results.storageKey });
  }
  return { expirePending: stalePending, keys, expireResult };
}
