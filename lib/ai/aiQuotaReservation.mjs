
import { randomUUID } from "node:crypto";

import {
    AI_DEV_LIMITS,
    AI_QUOTA_KEY,
} from "./aiQuotaPolicy.mjs";

function bucketWhere(identity, period) {
    return {
        ownerId_quotaKey_period_periodStart: {
            ownerId: identity.ownerId,
            quotaKey: AI_QUOTA_KEY,
            period,
            periodStart:
                period === "MONTH"
                    ? identity.quotaMonthStart
                    : identity.quotaDayStart,
        },
    };
}

export async function reserveAiAction({
    prisma,
    identity,
}) {
    if (typeof prisma?.$transaction !== "function") {
        throw new Error("AI reservation database unavailable.");
    }

    if (
        !identity?.ownerId ||
        !identity?.idempotencyKey ||
        !identity?.inputHash ||
        !["CAPTION", "ALT_TEXT"].includes(identity.action)
    ) {
        throw new Error("Invalid AI reservation identity.");
    }

    return prisma.$transaction(async (tx) => {
        // Monthly bucket acts as the per-user/month lock.
        await tx.$executeRaw`
      INSERT INTO "AiQuotaBucket" (
        "id", "ownerId", "quotaKey", "period",
        "periodStart", "used", "limitValue",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()}, ${identity.ownerId},
        ${AI_QUOTA_KEY}, 'MONTH'::"AiQuotaPeriod",
        ${identity.quotaMonthStart}, 0,
        ${AI_DEV_LIMITS.monthly}, NOW(), NOW()
      )
      ON CONFLICT (
        "ownerId", "quotaKey", "period", "periodStart"
      )
      DO UPDATE SET
        "used" = "AiQuotaBucket"."used"
    `;

        const existing = await tx.aiActionRequest.findUnique({
            where: {
                ownerId_idempotencyKey: {
                    ownerId: identity.ownerId,
                    idempotencyKey: identity.idempotencyKey,
                },
            },
        });

        if (existing) {
            if (
                existing.inputHash !== identity.inputHash ||
                existing.action !== identity.action
            ) {
                throw new Error("AI_IDEMPOTENCY_CONFLICT");
            }

            return {
                outcome: "EXISTING",
                requestId: existing.id,
                status: existing.status,
            };
        }

        const monthly = await tx.aiQuotaBucket.findUnique({
            where: bucketWhere(identity, "MONTH"),
        });

        if (!monthly) {
            throw new Error("Monthly AI quota bucket missing.");
        }

        if (monthly.used >= monthly.limitValue) {
            return {
                outcome: "QUOTA_EXCEEDED",
                period: "MONTH",
            };
        }

        await tx.$executeRaw`
      INSERT INTO "AiQuotaBucket" (
        "id", "ownerId", "quotaKey", "period",
        "periodStart", "used", "limitValue",
        "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()}, ${identity.ownerId},
        ${AI_QUOTA_KEY}, 'DAY'::"AiQuotaPeriod",
        ${identity.quotaDayStart}, 0,
        ${AI_DEV_LIMITS.daily}, NOW(), NOW()
      )
      ON CONFLICT (
        "ownerId", "quotaKey", "period", "periodStart"
      )
      DO NOTHING
    `;

        const daily = await tx.aiQuotaBucket.findUnique({
            where: bucketWhere(identity, "DAY"),
        });

        if (!daily) {
            throw new Error("Daily AI quota bucket missing.");
        }

        if (daily.used >= daily.limitValue) {
            return {
                outcome: "QUOTA_EXCEEDED",
                period: "DAY",
            };
        }

        const monthUpdate = await tx.aiQuotaBucket.updateMany({
            where: {
                id: monthly.id,
                used: { lt: monthly.limitValue },
            },
            data: { used: { increment: 1 } },
        });

        if (monthUpdate.count !== 1) {
            throw new Error("Monthly quota update failed.");
        }

        const dayUpdate = await tx.aiQuotaBucket.updateMany({
            where: {
                id: daily.id,
                used: { lt: daily.limitValue },
            },
            data: { used: { increment: 1 } },
        });

        if (dayUpdate.count !== 1) {
            throw new Error("Daily quota update failed.");
        }

        const reservation = await tx.aiActionRequest.create({
            data: {
                ownerId: identity.ownerId,
                idempotencyKey: identity.idempotencyKey,
                inputHash: identity.inputHash,
                action: identity.action,
                quotaDayStart: identity.quotaDayStart,
                quotaMonthStart: identity.quotaMonthStart,
                quotaCounted: true,
                status: "RESERVED",
            },
        });

        return {
            outcome: "RESERVED",
            requestId: reservation.id,
            status: reservation.status,
        };
    });
}
