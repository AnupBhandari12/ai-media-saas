import { auth } from "@clerk/nextjs/server";

import prisma from "@/lib/prisma";
import { WORKER_DOCUMENT_TOOL_IDS } from "@/lib/worker/jobConfig";

export function uploadResponseError(message, status) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function getUploadJob(request, params) {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return { error: uploadResponseError("Unauthorized", 401) };

  if (process.env.WORKER_JOBS_ENABLED !== "true" || process.env.WORKER_UPLOADS_ENABLED !== "true") {
    return { error: uploadResponseError("Document uploads are not enabled.", 503) };
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return { error: uploadResponseError("Invalid request origin.", 403) };
  }

  const { id } = await params;
  if (!/^c[a-z0-9]{10,60}$/.test(id ?? "")) return { error: uploadResponseError("Job not found.", 404) };

  const job = await prisma.processingJob.findFirst({
    where: { id, ownerId: userId, toolId: { in: WORKER_DOCUMENT_TOOL_IDS } },
  });
  if (!job) return { error: uploadResponseError("Job not found.", 404) };
  return { job, userId };
}
