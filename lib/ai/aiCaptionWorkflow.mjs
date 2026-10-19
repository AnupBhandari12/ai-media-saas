import { buildAiReservationIdentity } from "./aiReservationIdentity.mjs";
import { reserveAiAction } from "./aiQuotaReservation.mjs";
import {
  completeAiAction,
  markAiActionUnknown,
  startAiAction,
} from "./aiActionAccounting.mjs";
import { OPENAI_TEXT_MODEL } from "./openaiProvider.mjs";

/**
 * Internal server-only caption workflow. Intentionally NOT exposed by any HTTP
 * route. It never imports a network transport, API key, or fetch function.
 *
 * IMPORTANT: `enabled` must come from a server-side permission + spend gate,
 * NEVER from a client request body. Do not wire this to a public route before
 * a durable global USD spending ceiling and paid-provider opt-in are ready.
 */
export async function runAiCaptionWorkflow({
  prisma,
  ownerId,
  idempotencyKey,
  description,
  enabled = false,
  providerFn,
  now = new Date(),
} = {}) {
  // This guard is deliberately BEFORE all database work.
  if (enabled !== true) return { outcome: "DISABLED" };
  if (typeof providerFn !== "function") {
    throw new Error("AI caption provider is not configured.");
  }

  const identity = buildAiReservationIdentity({
    ownerId,
    idempotencyKey,
    action: "CAPTION",
    input: description,
    now,
  });

  const reserved = await reserveAiAction({ prisma, identity });
  if (reserved.outcome !== "RESERVED") {
    // EXISTING gives the existing ID and state, never repeats provider work.
    // QUOTA_EXCEEDED returns the period with no provider dispatch.
    return reserved;
  }

  const requestId = reserved.requestId;
  const claim = await startAiAction({
    prisma,
    ownerId: identity.ownerId,
    requestId,
    now,
  });
  if (claim.outcome !== "STARTED") {
    // Keep reserved quota for manual reconciliation; do not guess that
    // an external provider has or has not been called elsewhere.
    return { outcome: "NOT_STARTABLE", requestId };
  }

  // This is the irreversible dispatch boundary. From here, a failure is
  // conservatively UNKNOWN: no blind auto-retry or quota refund.
  try {
    const response = await providerFn({
      description: description.trim(),
      enabled: true,
    });

    const usage = response?.usage;
    if (
      response?.status !== "SUCCESS" ||
      response.action !== "CAPTION" ||
      response.provider !== "openai" ||
      response.model !== OPENAI_TEXT_MODEL ||
      typeof response.text !== "string" ||
      !Number.isSafeInteger(usage?.inputTokens) ||
      usage.inputTokens <= 0 ||
      !Number.isSafeInteger(usage?.outputTokens) ||
      usage.outputTokens < 0 ||
      usage.outputTokens > 220
    ) {
      throw new Error("Invalid provider result for AI caption.");
    }

    const completed = await completeAiAction({
      prisma,
      ownerId: identity.ownerId,
      requestId,
      text: response.text,
      model: response.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      now: new Date(),
    });
    if (completed.outcome !== "COMPLETED") {
      throw new Error("AI caption completion requires reconciliation.");
    }

    return {
      outcome: "COMPLETED",
      requestId,
      text: response.text.trim(),
      estimatedCostUsd: completed.estimatedCostUsd,
      generated: true,
    };
  } catch {
    // Even if the provider really succeeded, we cannot assume the outcome.
    // A failed accounting write also ends up here: leave the slot charged.
    const state = await markAiActionUnknown({
      prisma,
      ownerId: identity.ownerId,
      requestId,
    });
    if (state.outcome !== "UNKNOWN") {
      return { outcome: "RECONCILIATION_REQUIRED", requestId };
    }
    return { outcome: "UNKNOWN", requestId };
  }
}
