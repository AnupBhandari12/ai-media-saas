
import { AI_ACTIONS } from "./providerAdapter.mjs";

export const AI_QUOTA_KEY = "AI_ACTION";

export const AI_DEV_LIMITS = Object.freeze({
    daily: 3,
    monthly: 20,
});

export function checkAiQuota({
    action,
    dailyUsed,
    monthlyUsed,
}) {
    if (!Object.values(AI_ACTIONS).includes(action)) {
        throw new Error("Unsupported AI action.");
    }

    for (const count of [dailyUsed, monthlyUsed]) {
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new Error("Invalid AI usage count.");
        }
    }

    const dailyRemaining = Math.max(
        0,
        AI_DEV_LIMITS.daily - dailyUsed
    );

    const monthlyRemaining = Math.max(
        0,
        AI_DEV_LIMITS.monthly - monthlyUsed
    );

    return {
        allowed: dailyRemaining > 0 && monthlyRemaining > 0,
        quotaKey: AI_QUOTA_KEY,
        dailyRemaining,
        monthlyRemaining,
    };
}
