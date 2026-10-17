import { randomUUID } from "node:crypto";

import prisma from "@/lib/prisma";
import { isAllowedDocumentType } from "@/lib/worker/jobConfig";
import {
  deleteStoredObject,
  freezeVerifiedObject,
  inspectUploadedObject,
  inspectVerifiedObject,
} from "@/lib/worker/objectStorage";
import { getUploadJob, uploadResponseError } from "@/lib/worker/uploadAuth";
import { getDocumentMime, makeVerifiedKey, matchesOfficeSignature } from "@/lib/worker/uploadRules";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const access = await getUploadJob(request, params);
  if (access.error) return access.error;

  const { job, userId } = access;
  const refs = job.inputRefs ?? {};
  if (job.status !== "PENDING" || refs.stage !== "UPLOADING" ||
      !isAllowedDocumentType(job.toolId, refs.filename) ||
      typeof refs.storageKey !== "string" ||
      !refs.storageKey.startsWith(`uploads/${job.id}/`)) {
    return uploadResponseError("This job has no active document upload.", 409);
  }

  const expectedType = getDocumentMime(refs.extension);
  let upload;
  try {
    upload = await inspectUploadedObject(refs.storageKey);
  } catch {
    return uploadResponseError("Uploaded file not found or unreadable. Retry the upload.", 409);
  }

  if (upload.bytes !== refs.expectedBytes ||
      upload.contentType !== expectedType ||
      !matchesOfficeSignature(refs.extension, upload.signature)) {
    return uploadResponseError("Uploaded file type or size does not match the reservation. Retry with a valid document.", 422);
  }

  // Freeze the validated bytes under a key never exposed through a presigned PUT.
  const verifiedKey = makeVerifiedKey(job.id, refs.extension, randomUUID());
  try {
    await freezeVerifiedObject(refs.storageKey, verifiedKey);
    const copied = await inspectVerifiedObject(verifiedKey);
    if (copied.bytes !== upload.bytes || copied.contentType !== expectedType ||
        !matchesOfficeSignature(refs.extension, copied.signature)) {
      throw new Error("Verified file does not match the source.");
    }
  } catch {
    await deleteStoredObject(verifiedKey).catch(() => {});
    return uploadResponseError("Could not securely save the uploaded file.", 503);
  }

  const updated = await prisma.processingJob.updateMany({
    where: {
      id: job.id,
      ownerId: userId,
      status: "PENDING",
      inputRefs: { path: ["stage"], equals: "UPLOADING" },
    },
    data: {
      progress: 10,
      inputRefs: {
        ...refs,
        stage: "READY_FOR_PROCESSING",
        verifiedKey,
        verifiedBytes: upload.bytes,
      },
    },
  });

  if (updated.count !== 1) {
    await deleteStoredObject(verifiedKey).catch(() => {});
    return uploadResponseError("Job changed during upload. Refresh and try again.", 409);
  }

  // Best-effort only: a previous signed URL may be valid briefly.
  // R2 lifecycle must also purge orphan temp uploads.
  await deleteStoredObject(refs.storageKey).catch(() => {});

  return Response.json({
    job: { id: job.id, status: "PENDING", stage: "READY_FOR_PROCESSING", progress: 10 },
    message: "File uploaded and verified. Worker execution will be enabled in Phase 19B3.",
  }, { headers: { "Cache-Control": "no-store" } });
}

