import { AI_QUOTA_KEY } from "./aiQuotaPolicy.mjs";
import { estimateAiTextCost } from "./aiCostPolicy.mjs";

function requireIdentity(ownerId, requestId) {
  if (typeof ownerId !== "string" || !ownerId.trim()) {
    throw new Error("Authenticated owner is required.");
  }
  if (typeof requestId !== "string" || !requestId.trim()) {
    throw new Error("Valid AI request ID is required.");
  }
}

function requireDate(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Invalid AI action date.");
  }
}

function requireTransaction(prisma) {
  if (typeof prisma?.$transaction !== "function") {
    throw new Error("AI accounting database unavailable.");
  }
}

function requestWhere(ownerId, requestId) {
  return { id: requestId, ownerId };
}

/**
 * Claim a reserved request BEFORE attempting provider dispatch.
 * A PROCESSING request must not be automatically dispatched again.
 * This method does not invoke any provider and cannot spend API credit.
 */
export async function startAiAction({ prisma, ownerId, requestId, now = new Date() } = {}) {
  requireIdentity(ownerId, requestId);
  requireDate(now);
  if (typeof prisma?.aiActionRequest?.updateMany !== "function") {
    throw new Error("AI action database unavailable.");
  }

  const update = await prisma.aiActionRequest.updateMany({
    where: {
      ...requestWhere(ownerId, requestId),
      status: "RESERVED",
      quotaCounted: true,
    },
    data: {
      status: "PROCESSING",
      // Conservative dispatch intent: after this point, never blindly retry.
      dispatchedAt: now,
    },
  });

  return { outcome: update.count === 1 ? "STARTED" : "NOT_STARTABLE" };
}

/**
 * Finalize a successfully returned text result and write exactly one
 * successful-action UsageEvent in the SAME database transaction.
 * Requires actual provider-reported token usage; cost is an ESTIMATE.
 */
export async function completeAiAction({
  prisma,
  ownerId,
  requestId,
  text,
  model,
  inputTokens,
  outputTokens,
  now = new Date(),
} = {}) {
  requireIdentity(ownerId, requestId);
  requireDate(now);
  requireTransaction(prisma);
  if (typeof text !== "string" || !text.trim() || text.length > 8000) {
    throw new Error("Valid bounded AI output text is required.");
  }
  // This estimate uses the project's existing price table. Verify the
  // actual provider model ID and pricing BEFORE enabling real AI calls.
  if (!Number.isSafeInteger(inputTokens) || inputTokens <= 0) {
    throw new Error("Provider input token usage is required.");
  }
  const estimated = estimateAiTextCost({ model, inputTokens, outputTokens });

  return prisma.$transaction(async (tx) => {
    const action = await tx.aiActionRequest.findFirst({
      where: requestWhere(ownerId, requestId),
    });
    if (!action) return { outcome: "NOT_FOUND" };
    if (action.status === "COMPLETED") {
      return { outcome: "ALREADY_COMPLETED", requestId };
    }
    if (action.status !== "PROCESSING" || !action.quotaCounted) {
      return { outcome: "NOT_COMPLETABLE", status: action.status };
    }

    const updated = await tx.aiActionRequest.updateMany({
      where: {
        ...requestWhere(ownerId, requestId),
        status: "PROCESSING",
        quotaCounted: true,
      },
      data: {
        status: "COMPLETED",
        provider: "openai",
        model: estimated.model,
        inputTokens: estimated.inputTokens,
        outputTokens: estimated.outputTokens,
        estimatedCostUsd: estimated.estimatedCostUsd,
        resultJson: { text: text.trim() },
        completedAt: now,
      },
    });
    if (updated.count !== 1) {
      return { outcome: "NOT_COMPLETABLE" };
    }

    // aiActionRequestId has a unique constraint: double ledger entries
    // fail and roll back the entire completion transaction.
    await tx.usageEvent.create({
      data: {
        ownerId,
        quotaKey: AI_QUOTA_KEY,
        units: 1,
        toolId: action.action,
        aiActionRequestId: requestId,
        occurredAt: now,
      },
    });

    return {
      outcome: "COMPLETED",
      requestId,
      estimatedCostUsd: estimated.estimatedCostUsd,
    };
  });
}

/**
 * Release quota ONLY for a request still RESERVED (never dispatched).
 * Monthly bucket lock matches the reservation path's lock ordering.
 * Both decrements and the FAILED state commit or roll back together.
 */
export async function releaseUnsentAiAction({
  prisma,
  ownerId,
  requestId,
  now = new Date(),
} = {}) {
  requireIdentity(ownerId, requestId);
  requireDate(now);
  requireTransaction(prisma);

  return prisma.$transaction(async (tx) => {
    const action = await tx.aiActionRequest.findFirst({
      where: requestWhere(ownerId, requestId),
    });
    if (!action) return { outcome: "NOT_FOUND" };
    if (action.status !== "RESERVED" || !action.quotaCounted) {
      return { outcome: "NOT_RELEASABLE", status: action.status };
    }

    // Lock the monthly bucket before attempting to mutate action state.
    // Do not build SQL with string concatenation; Prisma parameterizes values.
    const lockCount = await tx.$executeRaw`
      UPDATE "AiQuotaBucket"
      SET "used" = "used"
      WHERE "ownerId" = ${ownerId}
        AND "quotaKey" = ${AI_QUOTA_KEY}
        AND "period" = 'MONTH'::"AiQuotaPeriod"
        AND "periodStart" = ${action.quotaMonthStart}
    `;
    if (lockCount !== 1) {
      throw new Error("AI monthly quota bucket missing during release.");
    }

    const changed = await tx.aiActionRequest.updateMany({
      where: {
        ...requestWhere(ownerId, requestId),
        status: "RESERVED",
        quotaCounted: true,
      },
      data: {
        status: "FAILED",
        quotaCounted: false,
        completedAt: now,
      },
    });
    if (changed.count !== 1) {
      return { outcome: "NOT_RELEASABLE" };
    }

    for (const [period, periodStart] of [
      ["MONTH", action.quotaMonthStart],
      ["DAY", action.quotaDayStart],
    ]) {
      const updated = await tx.aiQuotaBucket.updateMany({
        where: {
          ownerId,
          quotaKey: AI_QUOTA_KEY,
          period,
          periodStart,
          used: { gt: 0 },
        },
        data: { used: { decrement: 1 } },
      });
      if (updated.count !== 1) {
        throw new Error(`AI ${period} quota release failed.`);
      }
    }

    return { outcome: "RELEASED", requestId };
  });
}

/**
 * Provider call may have executed but its final result is uncertain.
 * Keep the quota charged/reserved: never auto-refund or auto-retry.
 */
export async function markAiActionUnknown({
  prisma,
  ownerId,
  requestId,
  now = new Date(),
} = {}) {
  requireIdentity(ownerId, requestId);
  requireDate(now);
  if (typeof prisma?.aiActionRequest?.updateMany !== "function") {
    throw new Error("AI action database unavailable.");
  }

  const updated = await prisma.aiActionRequest.updateMany({
    where: {
      ...requestWhere(ownerId, requestId),
      status: "PROCESSING",
      quotaCounted: true,
    },
    data: { status: "UNKNOWN", completedAt: now },
  });
  return { outcome: updated.count === 1 ? "UNKNOWN" : "UNCHANGED" };
}
