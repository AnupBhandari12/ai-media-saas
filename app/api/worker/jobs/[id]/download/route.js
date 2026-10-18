import { getUploadJob, uploadResponseError } from "@/lib/worker/uploadAuth";
import { createPresignedDownload } from "@/lib/worker/objectStorage";
import { isResultExpired } from "@/lib/worker/maintenanceRules.mjs";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const access = await getUploadJob(request, params);
  if (access.error) return access.error;

  const { job } = access;
  if (isResultExpired(job) || job.resultRefs?.expired === true) {
    return uploadResponseError("Document result expired after seven days.", 410);
  }
  const result = job.resultRefs;
  if (job.status !== "COMPLETED" || !result ||
      typeof result !== "object" || Array.isArray(result) ||
      typeof result.storageKey !== "string" ||
      !new RegExp(`^results/${job.id}/[0-9a-f-]{36}\\.pdf$`).test(result.storageKey)) {
    return uploadResponseError("Document result is not ready for download.", 409);
  }

  try {
    const signed = await createPresignedDownload({
      key: result.storageKey,
      filename: result.filename,
    });
    return Response.json({
      downloadUrl: signed.url,
      expiresIn: signed.expiresIn,
      filename: result.filename ?? "converted.pdf",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return uploadResponseError("Document download is temporarily unavailable.", 503);
  }
}
