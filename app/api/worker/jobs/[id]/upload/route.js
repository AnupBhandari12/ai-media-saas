import { randomUUID } from "node:crypto";

import prisma from "@/lib/prisma";
import { MAX_WORKER_DOCUMENT_BYTES, isAllowedDocumentType } from "@/lib/worker/jobConfig";
import { createPresignedUpload } from "@/lib/worker/objectStorage";
import { getUploadJob, uploadResponseError } from "@/lib/worker/uploadAuth";
import { getDocumentMime, makeUploadKey } from "@/lib/worker/uploadRules";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const access = await getUploadJob(request, params);
  if (access.error) return access.error;

  const { job, userId } = access;
  const refs = job.inputRefs ?? {};
  const stage = refs.stage;

  if (job.status !== "PENDING" || !["AWAITING_UPLOAD", "UPLOADING"].includes(stage)) {
    return uploadResponseError("This job is not awaiting a file.", 409);
  }
  if (!isAllowedDocumentType(job.toolId, refs.filename) ||
      !Number.isInteger(refs.expectedBytes) || refs.expectedBytes < 1 ||
      refs.expectedBytes > MAX_WORKER_DOCUMENT_BYTES) {
    return uploadResponseError("Invalid reserved document details.", 400);
  }

  const extension = refs.extension;
  const contentType = getDocumentMime(extension);
  if (!contentType) return uploadResponseError("Unsupported document format.", 400);

  const key = stage === "UPLOADING"
    ? refs.storageKey
    : makeUploadKey(job.id, extension, randomUUID());

  if (typeof key !== "string" || !key.startsWith(`uploads/${job.id}/`)) {
    return uploadResponseError("Invalid upload reservation. Please create a new job.", 409);
  }

  let signed;
  try {
    signed = await createPresignedUpload({ key, contentType });
  } catch {
    return uploadResponseError("Private file storage is unavailable.", 503);
  }

  if (stage === "AWAITING_UPLOAD") {
    // JSON path condition prevents concurrent requests from claiming the same reservation.
    const changed = await prisma.processingJob.updateMany({
      where: {
        id: job.id,
        ownerId: userId,
        status: "PENDING",
        inputRefs: { path: ["stage"], equals: "AWAITING_UPLOAD" },
      },
      data: {
        inputRefs: {
          ...refs,
          stage: "UPLOADING",
          storageKey: key,
          contentType,
        },
      },
    });
    if (changed.count !== 1) return uploadResponseError("Reservation changed. Refresh the job.", 409);
  }

  return Response.json({
    uploadUrl: signed.url,
    method: "PUT",
    headers: { "Content-Type": contentType },
    expiresIn: signed.expiresIn,
    expectedBytes: refs.expectedBytes,
    next: `/api/worker/jobs/${job.id}/confirm`,
  }, { headers: { "Cache-Control": "no-store" } });
}
