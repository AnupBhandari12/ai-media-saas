// Phase 19B3: run locally on a trusted development PC only.
// Run with: bun --env-file=.env.local scripts/worker/run-once.mjs
// Never expose this command through a public Next.js route.

import { execFile } from "node:child_process";
import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import prisma from "../../lib/prisma.js";
import {
  deleteStoredObject,
  downloadVerifiedDocument,
  savePrivateWorkerPdf,
} from "../../lib/worker/objectStorage.js";
import {
  dockerConversionArguments,
  makeResultKey,
  requireOfficeSignature,
  validateReadyJob,
} from "../../lib/worker/executionRules.js";
import { WORKER_DOCUMENT_TOOL_IDS } from "../../lib/worker/jobConfig.js";

const runFile = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workRoot = path.join(root, "worker", "local-files", "jobs");
const CONVERSION_TIMEOUT = 120_000;

function checkEnvironment() {
  if (process.env.WORKER_JOBS_ENABLED !== "true" ||
      process.env.WORKER_UPLOADS_ENABLED !== "true" ||
      process.env.WORKER_EXECUTION_ENABLED !== "true") {
    throw new Error("Enable worker jobs, uploads and local execution in .env.local first.");
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("This local worker must not run inside Vercel or production.");
  }
}

async function getNextReadyJob() {
  // One oldest eligible job. A manual run handles at most ONE conversion.
  // Atomic status/stage claim avoids processing the same reservation twice.
  const candidate = await prisma.processingJob.findFirst({
    where: {
      toolId: { in: WORKER_DOCUMENT_TOOL_IDS },
      status: "PENDING",
      inputRefs: { path: ["stage"], equals: "READY_FOR_PROCESSING" },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return null;

  const updated = await prisma.processingJob.updateMany({
    where: {
      id: candidate.id,
      status: "PENDING",
      inputRefs: { path: ["stage"], equals: "READY_FOR_PROCESSING" },
    },
    data: {
      status: "PROCESSING",
      progress: 20,
      startedAt: new Date(),
      inputRefs: { ...candidate.inputRefs, stage: "PROCESSING" },
    },
  });
  return updated.count === 1 ? candidate : null;
}

async function runDocker(jobId, jobDirectory, inputFilename) {
  const args = dockerConversionArguments({
    jobId, hostDirectory: jobDirectory, inputFilename,
  });
  try {
    const { stdout } = await runFile("docker", args, {
      cwd: root,
      timeout: CONVERSION_TIMEOUT,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    // Return short sanitized completion text, never any uploaded document content.
    return stdout.trim().slice(-300);
  } catch {
    // A killed Docker CLI process can leave a container behind.
    await runFile("docker", ["rm", "-f", `ai-media-${jobId}`], {
      timeout: 15_000,
      windowsHide: true,
    }).catch(() => {});
    throw new Error("Docker conversion failed or exceeded the time limit.");
  }
}

async function processOne(job) {
  let resultKey;
  let completed = false;
  const jobDirectory = path.join(workRoot, job.id);
  const inputDirectory = path.join(jobDirectory, "input");
  const outputDirectory = path.join(jobDirectory, "output");

  try {
    const settings = validateReadyJob(job);
    await mkdir(inputDirectory, { recursive: true });
    await mkdir(outputDirectory, { recursive: true });

    const original = await downloadVerifiedDocument({
      key: settings.verifiedKey,
      expectedBytes: settings.bytes,
    });
    requireOfficeSignature(settings.extension, original);

    const inputLocation = path.join(inputDirectory, settings.inputFilename);
    await writeFile(inputLocation, original, { flag: "wx", mode: 0o644 });
    console.log(`Processing job ${job.id} with isolated Docker container.`);
    await runDocker(job.id, jobDirectory, settings.inputFilename);

    const outputLocation = path.join(outputDirectory, settings.outputFilename);
    const pdf = await readFile(outputLocation);
    if (pdf.length < 20 || pdf.length > 50 * 1024 * 1024 ||
        pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("Worker did not produce a valid-sized PDF.");
    }

    resultKey = makeResultKey(job.id);
    const result = await savePrivateWorkerPdf({ key: resultKey, bytes: pdf });
    // The job is the only output authority; never expose the private B2 object key.
    const updated = await prisma.processingJob.updateMany({
      where: { id: job.id, status: "PROCESSING" },
      data: {
        status: "COMPLETED",
        progress: 100,
        completedAt: new Date(),
        inputRefs: { ...job.inputRefs, stage: "COMPLETED" },
        resultRefs: {
          storageKey: resultKey,
          bytes: result.bytes,
          contentType: "application/pdf",
          filename: settings.outputFilename,
        },
      },
    });
    if (updated.count !== 1) throw new Error("Job was changed before completion.");
    completed = true;
    console.log(`COMPLETED ${job.id}: ${result.bytes} PDF bytes. Download via authenticated job route.`);

    await prisma.usageEvent.create({
      data: {
        ownerId: job.ownerId,
        toolId: job.toolId,
        jobId: job.id,
        quotaKey: "WORKER_DOCUMENT_TOOL",
        units: 1,
      },
    }).catch(() => {
      // Completion must not be rewritten as FAILED if metering recording fails.
      console.warn("Usage event could not be recorded; reconcile before production.");
    });
    await deleteStoredObject(settings.verifiedKey).catch(() => {});
  } catch {
    if (!completed) {
      if (resultKey) await deleteStoredObject(resultKey).catch(() => {});
      await prisma.processingJob.updateMany({
        where: { id: job.id, status: "PROCESSING" },
        data: {
          status: "FAILED",
          progress: 0,
          completedAt: new Date(),
          errorCode: "DOCUMENT_PROCESSING_FAILED",
          errorMessage: "Document conversion failed. Try another valid Office document.",
          inputRefs: { ...job.inputRefs, stage: "FAILED" },
        },
      });
      console.error(`FAILED ${job.id}. Check Docker availability, object-storage connection and input validity.`);
    }
    process.exitCode = 1;
  } finally {
    await rm(jobDirectory, { recursive: true, force: true }).catch(() => {
      console.warn("Could not clean local work directory. Clean it manually.");
    });
  }
}

async function main() {
  checkEnvironment();
  const candidate = await getNextReadyJob();
  if (!candidate) {
    console.log("No ready document jobs found; nothing executed.");
    return;
  }
  await processOne(candidate);
}

try {
  await main();
} catch {
  console.error("Worker startup failed. Check local environment, Neon and Docker.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
