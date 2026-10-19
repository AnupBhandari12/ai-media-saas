
import { describe, expect, test } from "bun:test";

import {
    getAiUsageSnapshot,
} from "../../lib/ai/aiUsageReader.mjs";

const NOW = new Date("2026-10-19T08:30:00.000Z");

function fakeUsageEvent(daily = 1, monthly = 5) {
    const calls = [];

    return {
        calls,

        async count({ where }) {
            calls.push(where);

            return where.occurredAt.gte.getUTCDate() === 1
                ? monthly
                : daily;
        },
    };
}

describe("Phase 21 AI usage reader", () => {
    test("reads daily and monthly counts", async () => {
        const db = fakeUsageEvent(2, 7);

        const result = await getAiUsageSnapshot({
            usageEvent: db,
            ownerId: "user_123",
            now: NOW,
        });

        expect(result.daily.used).toBe(2);
        expect(result.monthly.used).toBe(7);
        expect(result.daily.remaining).toBe(1);
        expect(result.allowed).toBe(true);
    });

    test("queries only the signed-in owner", async () => {
        const db = fakeUsageEvent();

        await getAiUsageSnapshot({
            usageEvent: db,
            ownerId: "user_abc",
            now: NOW,
        });

        expect(db.calls).toHaveLength(2);

        for (const where of db.calls) {
            expect(where.ownerId).toBe("user_abc");
            expect(where.quotaKey).toBe("AI_ACTION");
            expect(where.occurredAt.lte).toEqual(NOW);
        }
    });

    test("uses UTC day and month boundaries", async () => {
        const db = fakeUsageEvent();

        await getAiUsageSnapshot({
            usageEvent: db,
            ownerId: "user_123",
            now: NOW,
        });

        expect(db.calls[0].occurredAt.gte).toEqual(
            new Date("2026-10-19T00:00:00.000Z")
        );

        expect(db.calls[1].occurredAt.gte).toEqual(
            new Date("2026-10-01T00:00:00.000Z")
        );
    });

    test("blocks exhausted quotas", async () => {
        const result = await getAiUsageSnapshot({
            usageEvent: fakeUsageEvent(3, 20),
            ownerId: "user_123",
            now: NOW,
        });

        expect(result.allowed).toBe(false);
        expect(result.daily.remaining).toBe(0);
        expect(result.monthly.remaining).toBe(0);
    });

    test("rejects missing owner", async () => {
        await expect(
            getAiUsageSnapshot({
                usageEvent: fakeUsageEvent(),
                ownerId: "",
                now: NOW,
            })
        ).rejects.toThrow("Valid owner ID required.");
    });
});
