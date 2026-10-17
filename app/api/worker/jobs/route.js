import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { getCurrentMonthStart } from "@/lib/limits";
import { createWorkerJobSchema } from "@/lib/validation/workerJob";
import {
  ACTIVE_JOB_WINDOW_MINUTES,
  MAX_RECENT_ACTIVE_JOBS,
  MAX_WORKER_JOBS_PER_MONTH,
  WORKER_DOCUMENT_TOOL_IDS,
  getDocumentExtension,
  toPublicWorkerJob,
} from "@/lib/worker/jobConfig";

export const runtime = "nodejs";

function workerApiEnabled() {
  return process.env.WORKER_JOBS_ENABLED === "true";
}

function disabledResponse() {
  return Response.json(
    { error: "Document jobs are not enabled yet." },
    { status: 503 },
  );
}

async function getUserId() {
  const { isAuthenticated, userId } = await auth();
  return isAuthenticated ? userId : null;
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!workerApiEnabled()) return disabledResponse();

  const jobs = await prisma.processingJob.findMany({
    where: {
      ownerId: userId,
      toolId: { in: WORKER_DOCUMENT_TOOL_IDS },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return Response.json({ jobs: jobs.map(toPublicWorkerJob) });
}

export async function POST(request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!workerApiEnabled()) return disabledResponse();

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) {
      return Response.json({ error: "Request body is too large." }, { status: 413 });
    }
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createWorkerJobSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid document job details. Check tool, filename and size." },
      { status: 400 },
    );
  }

  const { toolId, filename, bytes } = parsed.data;
  const windowStart = new Date(
    Date.now() - ACTIVE_JOB_WINDOW_MINUTES * 60_000,
  );

  // Metadata-only caps limit accidental/spam reservations. They are not
  // transactionally exact usage accounting; production quota needs stronger controls.
  const [monthCount, activeCount] = await Promise.all([
    prisma.processingJob.count({
      where: {
        ownerId: userId,
        toolId: { in: WORKER_DOCUMENT_TOOL_IDS },
        createdAt: { gte: getCurrentMonthStart() },
      },
    }),
    prisma.processingJob.count({
      where: {
        ownerId: userId,
        toolId: { in: WORKER_DOCUMENT_TOOL_IDS },
        status: { in: ["PENDING", "PROCESSING"] },
        createdAt: { gte: windowStart },
      },
    }),
  ]);

  if (monthCount >= MAX_WORKER_JOBS_PER_MONTH) {
    return Response.json(
      { error: "Monthly document job reservation limit reached." },
      { status: 429 },
    );
  }

  if (activeCount >= MAX_RECENT_ACTIVE_JOBS) {
    return Response.json(
      { error: "Too many recent active document jobs. Cancel one or try later." },
      { status: 429 },
    );
  }

  const job = await prisma.processingJob.create({
    data: {
      ownerId: userId,
      toolId,
      status: "PENDING",
      progress: 0,
      inputRefs: {
        stage: "AWAITING_UPLOAD",
        filename,
        expectedBytes: bytes,
        extension: getDocumentExtension(filename),
      },
    },
  });

  return Response.json(
    {
      job: toPublicWorkerJob(job),
      message: "Job reserved. Upload and processing are not available until Phase 19B2/19B3.",
    },
    { status: 201 },
  );
}
