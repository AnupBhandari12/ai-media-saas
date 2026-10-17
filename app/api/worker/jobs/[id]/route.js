import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import {
  WORKER_DOCUMENT_TOOL_IDS,
  toPublicWorkerJob,
} from "@/lib/worker/jobConfig";
import { deleteStoredObject } from "@/lib/worker/objectStorage";

export const runtime = "nodejs";

async function authorizedJob(params) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: Response.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (process.env.WORKER_JOBS_ENABLED !== "true") {
    return {
      error: Response.json({ error: "Document jobs are not enabled yet." }, { status: 503 }),
    };
  }

  const { id } = await params;
  if (typeof id !== "string" || id.length > 120) {
    return { error: Response.json({ error: "Job not found." }, { status: 404 }) };
  }

  const job = await prisma.processingJob.findFirst({
    where: {
      id,
      ownerId: userId,
      toolId: { in: WORKER_DOCUMENT_TOOL_IDS },
    },
  });

  if (!job) {
    return { error: Response.json({ error: "Job not found." }, { status: 404 }) };
  }

  return { job, userId };
}

export async function GET(_request, { params }) {
  const found = await authorizedJob(params);
  if (found.error) return found.error;
  return Response.json({ job: toPublicWorkerJob(found.job) });
}

export async function DELETE(_request, { params }) {
  const found = await authorizedJob(params);
  if (found.error) return found.error;

  const refs = found.job.inputRefs ?? {};
  const allowed = ["AWAITING_UPLOAD", "UPLOADING", "READY_FOR_PROCESSING"];
  if (found.job.status !== "PENDING" || !allowed.includes(refs.stage)) {
    return Response.json(
      { error: "Only jobs not yet processing may be cancelled." },
      { status: 409 },
    );
  }

  const updated = await prisma.processingJob.updateMany({
    where: {
      id: found.job.id,
      ownerId: found.userId,
      status: "PENDING",
      inputRefs: { path: ["stage"], equals: refs.stage },
    },
    data: { status: "CANCELLED", completedAt: new Date() },
  });

  if (updated.count !== 1) {
    return Response.json(
      { error: "Job status changed. Refresh and try again." },
      { status: 409 },
    );
  }

  // Upload URLs may remain valid for a few minutes. Lifecycle expiry is mandatory.
  if (process.env.WORKER_UPLOADS_ENABLED === "true") {
    for (const key of [refs.storageKey, refs.verifiedKey]) {
      if (typeof key === "string") {
        await deleteStoredObject(key).catch(() => {});
      }
    }
  }

  const job = await prisma.processingJob.findFirst({
    where: { id: found.job.id, ownerId: found.userId },
  });

  return Response.json({ job: toPublicWorkerJob(job) });
}
