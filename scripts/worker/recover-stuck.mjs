// Phase 19B6 — opt-in diagnosis/manual closure of interrupted local Office jobs.
// Dry-run: bun --env-file=.env.local scripts/worker/recover-stuck.mjs
// Explicit closure (AFTER all runner processes are stopped):
// bun --env-file=.env.local scripts/worker/recover-stuck.mjs --mark-failed JOB_ID --confirm-runners-stopped
// This NEVER retries a job, deletes an object, or modifies another owner's job.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import prisma from "../../lib/prisma.js";
import { assertDevOwner } from "../../lib/worker/maintenanceRules.mjs";
import {
  getRecoveryWhere,
  inspectStuckOfficeJob,
  isDockerMissingObjectError,
  isSafeRecoveryJobId,
  MAX_STALE_JOBS,
  STALE_PROCESSING_MS,
} from "../../lib/worker/recoveryRules.mjs";

const runFile = promisify(execFile);
const ownerId = assertDevOwner();
const argv = process.argv.slice(2);
const nowMs = Date.now();
const toolIds = ["PDF-20", "PDF-21", "PDF-22"];

function usage() {
  throw new Error("Usage: no arguments (read-only list), or --mark-failed JOB_ID --confirm-runners-stopped");
}

async function readJob(id) {
  return prisma.processingJob.findFirst({
    where: { id, ownerId, toolId: { in: toolIds } },
  });
}

async function verifyNoDockerContainer(jobId) {
  // A working Docker daemon is required, otherwise lack of a container
  // cannot be established safely. Never infer 'missing' from daemon errors.
  await runFile("docker", ["info", "--format", "{{.ServerVersion}}"], {
    windowsHide: true, timeout: 15_000,
  });
  const name = `ai-media-${jobId}`;
  try {
    await runFile("docker", ["container", "inspect", "--format", "{{.Id}}", name], {
      windowsHide: true, timeout: 15_000,
    });
  } catch (error) {
    if (isDockerMissingObjectError(error.stderr)) return;
    throw new Error("Cannot verify Docker container absence; no changes made.");
  }
  // Even a stopped-but-existing container requires inspection first.
  throw new Error(`Docker container ${name} exists. Inspect it first; no changes made.`);
}

async function list() {
  const cutoff = new Date(nowMs - STALE_PROCESSING_MS);
  const rows = await prisma.processingJob.findMany({
    where: {
      ownerId,
      toolId: { in: toolIds },
      status: "PROCESSING",
      startedAt: { lte: cutoff },
      updatedAt: { lte: cutoff },
      inputRefs: { path: ["stage"], equals: "PROCESSING" },
    },
    orderBy: { startedAt: "asc" },
    take: MAX_STALE_JOBS,
  });
  console.log("READ ONLY: candidate interrupted Office jobs (not confirmed crashed).");
  let count = 0;
  for (const job of rows) {
    const state = inspectStuckOfficeJob(job, ownerId, nowMs);
    if (!state.eligible) continue;
    count += 1;
    console.log(`${job.id} | ${job.toolId} | ${state.ageMinutes} minutes since start | manual review`);
  }
  if (count === 0) console.log("No stale processing Office jobs found.");
  console.log("No database or Backblaze objects changed.");
}

async function markFailed(jobId) {
  if (!isSafeRecoveryJobId(jobId)) usage();
  const job = await readJob(jobId);
  if (!job) throw new Error("Job does not exist for your configured development owner.");
  const condition = getRecoveryWhere(job, ownerId, nowMs);

  console.log(`Checking local Docker state for ${jobId}...`);
  await verifyNoDockerContainer(jobId);
  // The user MUST stop local run-auto/run-once consoles before this command.
  // Docker inspection alone cannot prove that a runner isn't downloading from B2.
  const changed = await prisma.processingJob.updateMany({
    where: condition,
    data: {
      status: "FAILED",
      progress: 0,
      completedAt: new Date(nowMs),
      errorCode: "LOCAL_WORKER_INTERRUPTED",
      errorMessage: "Local processing was interrupted. Create a new job to try again.",
      inputRefs: { ...job.inputRefs, stage: "FAILED" },
    },
  });
  if (changed.count !== 1) {
    throw new Error("Job changed before recovery. No status updated; inspect again.");
  }
  console.log(`MARKED FAILED: ${jobId}. No retry, storage deletion or download performed.`);
  console.log("Review B2 temporary/result objects and create a fresh job if appropriate.");
}

try {
  if (argv.length === 0) {
    await list();
  } else if (argv.length === 3 && argv[0] === "--mark-failed" &&
             argv[2] === "--confirm-runners-stopped") {
    await markFailed(argv[1]);
  } else usage();
} catch (error) {
  console.error(`Recovery stopped: ${error?.message || "Unknown error"}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
