
import {
    AI_QUOTA_KEY,
    AI_DEV_LIMITS,
    checkAiQuota,
} from "./aiQuotaPolicy.mjs";

export async function getAiUsageSnapshot({
    usageEvent,
    ownerId,
    now = new Date(),
} = {}) {
    if (typeof ownerId !== "string" || !ownerId.trim()) {
        throw new Error("Valid owner ID required.");
    }

    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new Error("Invalid usage date.");
    }

    if (typeof usageEvent?.count !== "function") {
        throw new Error("Usage database is unavailable.");
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

    const countUsage = (start) =>
        usageEvent.count({
            where: {
                ownerId,
                quotaKey: AI_QUOTA_KEY,
                occurredAt: {
                    gte: start,
                    lte: now,
                },
            },
        });

    const [dailyUsed, monthlyUsed] = await Promise.all([
        countUsage(dayStart),
        countUsage(monthStart),
    ]);

    const policy = checkAiQuota({
        action: "CAPTION",
        dailyUsed,
        monthlyUsed,
    });

    return {
        allowed: policy.allowed,
        quotaKey: AI_QUOTA_KEY,
        timezone: "UTC",
        daily: {
            used: dailyUsed,
            limit: AI_DEV_LIMITS.daily,
            remaining: policy.dailyRemaining,
        },
        monthly: {
            used: monthlyUsed,
            limit: AI_DEV_LIMITS.monthly,
            remaining: policy.monthlyRemaining,
        },
    };
}
