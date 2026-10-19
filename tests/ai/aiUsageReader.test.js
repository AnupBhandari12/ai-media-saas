
import { describe, expect, test } from "bun:test";

import {
    getAiUsageSnapshot,
} from "../../lib/ai/aiUsageReader.mjs";

const NOW = new Date("2026-10-19T08:30:00.000Z");

function fakeBuckets({
    daily = null,
    monthly = null,
} = {}) {
    const calls = [];

    return {
        calls,

        async findUnique({ where }) {
            const key =
                where.ownerId_quotaKey_period_periodStart;

            calls.push(key);

            return key.period === "DAY" ? daily : monthly;
        },
    };
}

describe("Phase 21 AI quota bucket reader", () => {
    test("returns default limits for a new user", async () => {
        const result = await getAiUsageSnapshot({
            aiQuotaBucket: fakeBuckets(),
            ownerId: "user_123",
            now: NOW,
        });

        expect(result.daily).toEqual({
            used: 0,
            limit: 3,
            remaining: 3,
        });

        expect(result.monthly).toEqual({
            used: 0,
            limit: 20,
            remaining: 20,
        });

        expect(result.allowed).toBe(true);
    });

    test("reads actual reserved counters", async () => {
        const result = await getAiUsageSnapshot({
            aiQuotaBucket: fakeBuckets({
                daily: { used: 2, limitValue: 3 },
                monthly: { used: 7, limitValue: 20 },
            }),
            ownerId: "user_123",
            now: NOW,
        });

        expect(result.daily.used).toBe(2);
        expect(result.daily.remaining).toBe(1);
        expect(result.monthly.used).toBe(7);
        expect(result.monthly.remaining).toBe(13);
        expect(result.allowed).toBe(true);
    });

    test("queries the owner and UTC periods", async () => {
        const db = fakeBuckets();

        await getAiUsageSnapshot({
            aiQuotaBucket: db,
            ownerId: "user_abc",
            now: NOW,
        });

        expect(db.calls).toHaveLength(2);

        const day = db.calls.find(
            (call) => call.period === "DAY"
        );

        const month = db.calls.find(
            (call) => call.period === "MONTH"
        );

        expect(day.ownerId).toBe("user_abc");
        expect(month.ownerId).toBe("user_abc");

        expect(day.quotaKey).toBe("AI_ACTION");
        expect(month.quotaKey).toBe("AI_ACTION");

        expect(day.periodStart.toISOString()).toBe(
            "2026-10-19T00:00:00.000Z"
        );

        expect(month.periodStart.toISOString()).toBe(
            "2026-10-01T00:00:00.000Z"
        );
    });

    test("blocks exhausted daily quota", async () => {
        const result = await getAiUsageSnapshot({
            aiQuotaBucket: fakeBuckets({
                daily: { used: 3, limitValue: 3 },
                monthly: { used: 3, limitValue: 20 },
            }),
            ownerId: "user_123",
            now: NOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.daily.remaining).toBe(0);
    });

    test("blocks exhausted monthly quota", async () => {
        const result = await getAiUsageSnapshot({
            aiQuotaBucket: fakeBuckets({
                daily: { used: 1, limitValue: 3 },
                monthly: { used: 20, limitValue: 20 },
            }),
            ownerId: "user_123",
            now: NOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.monthly.remaining).toBe(0);
    });

    test("respects database-stored limits", async () => {
        const result = await getAiUsageSnapshot({
            aiQuotaBucket: fakeBuckets({
                daily: { used: 2, limitValue: 2 },
                monthly: { used: 2, limitValue: 20 },
            }),
            ownerId: "user_123",
            now: NOW,
        });

        expect(result.daily.limit).toBe(2);
        expect(result.allowed).toBe(false);
    });

    test("rejects invalid bucket counters", async () => {
        await expect(
            getAiUsageSnapshot({
                aiQuotaBucket: fakeBuckets({
                    daily: { used: -1, limitValue: 3 },
                }),
                ownerId: "user_123",
                now: NOW,
            })
        ).rejects.toThrow("Invalid AI quota bucket.");
    });

    test("rejects missing owner", async () => {
        await expect(
            getAiUsageSnapshot({
                aiQuotaBucket: fakeBuckets(),
                ownerId: "",
                now: NOW,
            })
        ).rejects.toThrow("Valid owner ID required.");
    });
});
