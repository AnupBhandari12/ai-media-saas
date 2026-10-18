// Phase 19B6: pure safety rules for manual recovery of interrupted local Office jobs.
// No automatic retry, storage deletion, or DB migration.
export const STALE_PROCESSING_MS = 30 * 60 * 1000;
export const MAX_STALE_JOBS = 25;
const JOB_ID_PATTERN = /^c[a-z0-9]{10,60}$/;

export function isSafeRecoveryJobId(id) {
  return typeof id === "string" && JOB_ID_PATTERN.test(id);
}

function validDate(value) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

// A job is a *candidate* for operator review only. Time alone never proves
// that a worker process stopped or that a remote result was not written.
export function inspectStuckOfficeJob(job, ownerId, nowMs = Date.now()) {
  if (!job || !isSafeRecoveryJobId(job.id) ||
      typeof ownerId !== "string" || job.ownerId !== ownerId ||
      !["PDF-20", "PDF-21", "PDF-22"].includes(job.toolId) ||
      job.status !== "PROCESSING" ||
      !job.inputRefs || typeof job.inputRefs !== "object" ||
      Array.isArray(job.inputRefs) || job.inputRefs.stage !== "PROCESSING") {
    return { eligible: false, reason: "Job is not an owned processing Office job." };
  }
  const started = validDate(job.startedAt);
  const updated = validDate(job.updatedAt);
  if (started === null || updated === null ||
      started > nowMs || updated > nowMs ||
      nowMs - started < STALE_PROCESSING_MS ||
      nowMs - updated < STALE_PROCESSING_MS) {
    return { eligible: false, reason: "Job is not stale for 30 minutes." };
  }
  return {
    eligible: true,
    reason: "Potentially interrupted: operator investigation required.",
    ageMinutes: Math.floor((nowMs - started) / 60_000),
  };
}

export function getRecoveryWhere(job, ownerId, nowMs = Date.now()) {
  const check = inspectStuckOfficeJob(job, ownerId, nowMs);
  if (!check.eligible) throw new Error(check.reason);
  return {
    id: job.id,
    ownerId,
    toolId: { in: ["PDF-20", "PDF-21", "PDF-22"] },
    status: "PROCESSING",
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
    inputRefs: { path: ["stage"], equals: "PROCESSING" },
  };
}

export function isDockerMissingObjectError(stderr) {
  // Distinguish a missing container from a broken Docker daemon.
  return typeof stderr === "string" &&
    /(?:No such (?:object|container):|Error: No such (?:object|container):)/i.test(stderr);
}
