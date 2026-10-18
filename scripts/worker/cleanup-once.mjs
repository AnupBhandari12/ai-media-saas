// Phase 19B5 — owner-scoped cleanup, always DRY-RUN unless explicit opt-in.
// Read-only preview: bun --env-file=.env.local scripts/worker/cleanup-once.mjs
// Apply: bun --env-file=.env.local scripts/worker/cleanup-once.mjs --apply --confirm-owner-scoped-delete
import prisma from "../../lib/prisma.js";
import { deleteStoredObject } from "../../lib/worker/objectStorage.js";
import { WORKER_DOCUMENT_TOOL_IDS } from "../../lib/worker/jobConfig.js";
import {
  assertCleanupAllowed,
  makeCleanupPlan,
  MAX_CLEANUP_JOBS,
  TEMP_RETENTION_MS,
} from "../../lib/worker/maintenanceRules.mjs";

const nowMs = Date.now();
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const acceptable = new Set(["--apply", "--confirm-owner-scoped-delete"]);

async function cleanupOne(job, ownerId) {
  // Re-read and re-evaluate directly before any mutation: jobs may have changed.
  const fresh = await prisma.processingJob.findFirst({
    where: { id: job.id, ownerId, toolId: { in: WORKER_DOCUMENT_TOOL_IDS } },
  });
  if (!fresh) return { skipped: true };
  let plan = makeCleanupPlan(fresh, nowMs);
  if (!plan.expirePending && !plan.keys.length) return { skipped: true };

  if (plan.expirePending) {
    // Atomically transition only stale unconfirmed uploads out of PENDING before cleanup.
    const changed = await prisma.processingJob.updateMany({
      where: {
        id: fresh.id, ownerId, status: "PENDING",
        createdAt: { lte: new Date(nowMs - TEMP_RETENTION_MS) },
        updatedAt: { lte: new Date(nowMs - TEMP_RETENTION_MS) },
        inputRefs: { path: ["stage"], equals: fresh.inputRefs.stage },
      },
      data: {
        status: "FAILED", progress: 0, completedAt: new Date(nowMs),
        errorCode: "UPLOAD_EXPIRED",
        errorMessage: "Upload reservation expired before confirmation.",
        inputRefs: { ...fresh.inputRefs, stage: "EXPIRED" },
      },
    });
    if (changed.count !== 1) return { skipped: true };
  }

  let count = 0;
  let resultDeleted = false;
  for (const item of plan.keys) {
    try {
      await deleteStoredObject(item.key);
      count++;
      if (item.kind === "result") resultDeleted = true;
    } catch {
      console.warn(`Could not remove one ${item.kind} object for job ${fresh.id}; retry cleanup later.`);
    }
  }

  if (resultDeleted && plan.expireResult) {
    await prisma.processingJob.updateMany({
      where: { id: fresh.id, ownerId, status: "COMPLETED" },
      data: {
        resultRefs: {
          ...fresh.resultRefs, expired: true, expiredAt: new Date(nowMs).toISOString(),
        },
      },
    });
  }
  return { skipped: false, removed: count };
}

async function main() {
  if (args.some(v => !acceptable.has(v)) || (apply && !args.includes("--confirm-owner-scoped-delete"))) {
    throw new Error("Use no arguments for dry-run, or --apply --confirm-owner-scoped-delete for deletion.");
  }
  const ownerId = assertCleanupAllowed(process.env, apply);
  const candidates = await prisma.processingJob.findMany({
    where: {
      ownerId,
      toolId: { in: WORKER_DOCUMENT_TOOL_IDS },
      OR: [
        { status: "PENDING", createdAt: { lte: new Date(nowMs - TEMP_RETENTION_MS) } },
        { status: { in: ["COMPLETED", "FAILED", "CANCELLED"] }, completedAt: { lte: new Date(nowMs - TEMP_RETENTION_MS) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: MAX_CLEANUP_JOBS,
  });
  const plans = candidates.map(job => ({ job, plan: makeCleanupPlan(job, nowMs) }))
    .filter(v => v.plan.expirePending || v.plan.keys.length);

  console.log(apply ? "APPLY MODE — owner-scoped cleanup." : "DRY RUN — no database or storage changes.");
  console.log(`Found ${plans.length} eligible jobs (max ${MAX_CLEANUP_JOBS} per run).`);
  for (const { job, plan } of plans) {
    console.log(`${job.id}: expireReservation=${plan.expirePending}, temp=${plan.keys.filter(k => k.kind !== "result").length}, result=${plan.keys.filter(k => k.kind === "result").length}`);
  }
  if (!apply) {
    console.log("No objects were deleted. Apply requires WORKER_CLEANUP_ENABLED=true and explicit command flags.");
    return;
  }
  let removed = 0;
  let failures = 0;
  for (const { job } of plans) {
    try {
      const outcome = await cleanupOne(job, ownerId);
      removed += outcome.removed ?? 0;
    } catch (error) {
      failures++;
      console.error(`Cleanup failed for ${job.id}; inspect and retry.`, error.message);
    }
  }
  console.log(`Cleanup finished. Object delete requests completed: ${removed}; failed jobs: ${failures}.`);
  if (failures > 0) process.exitCode = 1;
}

try { await main(); }
catch (error) { console.error(`Cleanup aborted: ${error.message}`); process.exitCode = 1; }
finally { await prisma.$disconnect(); }
