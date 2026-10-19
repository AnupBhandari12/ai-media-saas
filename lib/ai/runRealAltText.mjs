import { createHash } from "node:crypto";
import { buildAiReservationIdentity } from "./aiReservationIdentity.mjs";
import { reserveAiAction } from "./aiQuotaReservation.mjs";
import { startAiAction, completeAiAction, markAiActionUnknown } from "./aiActionAccounting.mjs";
import { requestRealAltText } from "./realAiVisionTransport.mjs";
import { AI_BUDGET_RESERVATION_MICROS } from "./realAiGlobalBudget.mjs";
import { decodeBackgroundImageWithSharp } from "./aiSharpDecoder.mjs";

const SUPPORTED = new Set(["image/png", "image/jpeg", "image/webp"]);
export const VISION_MAX_BYTES = 2_000_000;
export const VISION_MAX_PIXELS = 4_000_000;

/** Full server-side verification BEFORE reserving any paid quota. Never trusts client dimensions. */
export async function verifyVisionImage({ bytes, mimeType, decode = decodeBackgroundImageWithSharp } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 64 || bytes.length > VISION_MAX_BYTES ||
      !SUPPORTED.has(mimeType) || typeof decode !== "function") {
    throw new Error("INVALID_VISION_IMAGE");
  }
  const original = Buffer.from(bytes);
  const decoded = await decode({ imageBytes: original, mimeType });
  const { width, height, pixels } = decoded ?? {};
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) ||
      width < 1 || height < 1 || width > 4096 || height > 4096 ||
      width * height > VISION_MAX_PIXELS || !(pixels instanceof Uint8Array) ||
      pixels.length !== width * height * 4) {
    throw new Error("INVALID_VISION_DIMENSIONS");
  }
  return Object.freeze({
    mimeType, bytes: original, width, height,
    fingerprint: createHash("sha256").update(mimeType).update(original).digest("hex"),
  });
}

/** One UUID gets at most one provider dispatch. Uncertain billing holds the full reservation. */
export async function runRealAltText({ prisma, ownerId, idempotencyKey, image, apiKey, fetchFn = fetch } = {}) {
  if (typeof apiKey !== "string" || !apiKey.startsWith("sk-") || typeof fetchFn !== "function") {
    return { outcome: "PROVIDER_NOT_CONFIGURED" };
  }
  // All validation is performed before quota/budget reservation or network dispatch.
  const verified = await verifyVisionImage(image);
  const identity = buildAiReservationIdentity({
    ownerId, idempotencyKey, action: "ALT_TEXT", input: `image-sha256:${verified.fingerprint}`,
  });
  const claimed = await reserveAiAction({
    prisma, identity, budgetMicros: AI_BUDGET_RESERVATION_MICROS.ALT_TEXT,
  });
  if (claimed.outcome !== "RESERVED") return claimed;
  const requestId = claimed.requestId;
  const started = await startAiAction({ prisma, ownerId: identity.ownerId, requestId });
  if (started.outcome !== "STARTED") return { outcome: "NOT_STARTABLE", requestId };
  try {
    const response = await requestRealAltText({
      image: verified, enabled: true, serverApproval: true, apiKey, fetchFn,
    });
    const committed = await completeAiAction({
      prisma, ownerId: identity.ownerId, requestId, text: response.text,
      model: response.model, inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens, requireBudgeted: true,
    });
    if (committed.outcome !== "COMPLETED") throw new Error("COMPLETION_NOT_DURABLE");
    return { outcome: "COMPLETED", requestId, text: response.text,
      estimatedCostUsd: committed.estimatedCostUsd };
  } catch {
    try { await markAiActionUnknown({ prisma, ownerId: identity.ownerId, requestId }); }
    catch { return { outcome: "RECONCILIATION_REQUIRED", requestId }; }
    return { outcome: "UNKNOWN", requestId };
  }
}
