
import {
    AI_QUOTA_KEY,
    AI_DEV_LIMITS,
} from "./aiQuotaPolicy.mjs";

function normalizeBucket(bucket, defaultLimit) {
    if (bucket == null) {
        return {
            used: 0,
            limit: defaultLimit,
            remaining: defaultLimit,
        };
    }

    const { used, limitValue } = bucket;

    if (
        !Number.isSafeInteger(used) ||
        used < 0 ||
        !Number.isSafeInteger(limitValue) ||
        limitValue < 0
    ) {
        throw new Error("Invalid AI quota bucket.");
    }

    return {
        used,
        limit: limitValue,
        remaining: Math.max(0, limitValue - used),
    };
}

export async function getAiUsageSnapshot({
    aiQuotaBucket,
    ownerId,
    now = new Date(),
} = {}) {
    if (typeof ownerId !== "string" || !ownerId.trim()) {
        throw new Error("Valid owner ID required.");
    }

    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new Error("Invalid usage date.");
    }

    if (typeof aiQuotaBucket?.findUnique !== "function") {
        throw new Error("AI quota database is unavailable.");
    }

    const dayStart = new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate()
        )
    );

    const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const readBucket = (period, periodStart) =>
        aiQuotaBucket.findUnique({
            where: {
                ownerId_quotaKey_period_periodStart: {
                    ownerId,
                    quotaKey: AI_QUOTA_KEY,
                    period,
                    periodStart,
                },
            },
        });

    const [dayBucket, monthBucket] = await Promise.all([
        readBucket("DAY", dayStart),
        readBucket("MONTH", monthStart),
    ]);

    const daily = normalizeBucket(
        dayBucket,
        AI_DEV_LIMITS.daily
    );

    const monthly = normalizeBucket(
        monthBucket,
        AI_DEV_LIMITS.monthly
    );

    return {
        allowed:
            daily.remaining > 0 && monthly.remaining > 0,
        quotaKey: AI_QUOTA_KEY,
        timezone: "UTC",
        daily,
        monthly,
    };
}
