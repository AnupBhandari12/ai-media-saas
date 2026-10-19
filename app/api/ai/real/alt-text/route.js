import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { runRealAltText, VISION_MAX_BYTES } from "@/lib/ai/runRealAltText.mjs";

export const dynamic = "force-dynamic";
const responseHeaders = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const MAX_REQUEST_BYTES = VISION_MAX_BYTES + 32_768;
function reply(data, status) { return Response.json(data, { status, headers: responseHeaders }); }

export async function POST(request) {
  // Missing operator approval must deny BEFORE parsing, DB, or provider dispatch.
  if (process.env.AI_REAL_ALT_TEXT_ENABLED !== "true" ||
      process.env.AI_REAL_SPEND_APPROVED !== "true") {
    return reply({ error: "Real AI Alt Text is disabled." }, 503);
  }
  if (typeof process.env.OPENAI_API_KEY !== "string" ||
      !process.env.OPENAI_API_KEY.startsWith("sk-")) {
    return reply({ error: "AI provider is not configured." }, 503);
  }
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) return reply({ error: "Unauthorized" }, 401);
  // Browsers send origin for POST. Fail closed for missing and cross-origin requests.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Invalid origin" }, 403);
  }
  if (!/^multipart\/form-data;\s*boundary=/i.test(request.headers.get("content-type") || "")) {
    return reply({ error: "Expected an image upload" }, 415);
  }
  const lengthHeader = request.headers.get("content-length");
  const length = Number(lengthHeader);
  if (!lengthHeader || !Number.isSafeInteger(length) || length < 64 || length > MAX_REQUEST_BYTES) {
    return reply({ error: "Image request too large or missing length" }, 413);
  }
  try {
    const form = await request.formData();
    if ([...form.keys()].sort().join() !== "image,requestId" ||
        form.getAll("image").length !== 1 || form.getAll("requestId").length !== 1) {
      return reply({ error: "Unexpected upload fields" }, 400);
    }
    const file = form.get("image");
    const requestId = form.get("requestId");
    if (!(file instanceof File) || file.size < 64 || file.size > VISION_MAX_BYTES ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        typeof requestId !== "string") {
      return reply({ error: "Invalid image or request ID" }, 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await runRealAltText({
      prisma, ownerId: userId, idempotencyKey: requestId,
      image: { bytes, mimeType: file.type }, apiKey: process.env.OPENAI_API_KEY,
    });
    if (result.outcome === "COMPLETED") {
      return reply({ text: result.text, requestId: result.requestId,
        estimatedCostUsd: result.estimatedCostUsd }, 200);
    }
    if (["QUOTA_EXCEEDED", "SPEND_BUDGET_BLOCKED"].includes(result.outcome)) {
      return reply({ error: "AI quota or approved budget exhausted." }, 429);
    }
    return reply({ error: "Request requires status review. Do not retry automatically.",
      requestId: result.requestId }, 409);
  } catch {
    return reply({ error: "Image request rejected or requires review. Do not retry automatically." }, 400);
  }
}
