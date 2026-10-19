
import { describe, expect, test } from "bun:test";

import {
    AI_QUOTA_KEY,
    checkAiQuota,
} from "../../lib/ai/aiQuotaPolicy.mjs";

describe("Phase 21 AI quota policy", () => {
    test("allows actions within limits", () => {
        const result = checkAiQuota({
            action: "CAPTION",
            dailyUsed: 1,
            monthlyUsed: 5,
        });

        expect(result.allowed).toBe(true);
        expect(result.dailyRemaining).toBe(2);
        expect(result.monthlyRemaining).toBe(15);
        expect(result.quotaKey).toBe(AI_QUOTA_KEY);
    });

    test("blocks daily limit", () => {
        const result = checkAiQuota({
            action: "CAPTION",
            dailyUsed: 3,
            monthlyUsed: 5,
        });

        expect(result.allowed).toBe(false);
    });

    test("blocks monthly limit", () => {
        const result = checkAiQuota({
            action: "ALT_TEXT",
            dailyUsed: 1,
            monthlyUsed: 20,
        });

        expect(result.allowed).toBe(false);
    });

    test("rejects unsupported actions", () => {
        expect(() =>
            checkAiQuota({
                action: "UNKNOWN",
                dailyUsed: 0,
                monthlyUsed: 0,
            })
        ).toThrow("Unsupported AI action.");
    });

    test("rejects invalid usage counts", () => {
        expect(() =>
            checkAiQuota({
                action: "CAPTION",
                dailyUsed: -1,
                monthlyUsed: 0,
            })
        ).toThrow("Invalid AI usage count.");
    });
});
