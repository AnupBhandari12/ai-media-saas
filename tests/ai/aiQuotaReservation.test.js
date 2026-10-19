
import { describe, expect, test } from "bun:test";

import {
    reserveAiAction,
} from "../../lib/ai/aiQuotaReservation.mjs";

const identity = {
    ownerId: "user_test",
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    inputHash: "a".repeat(64),
    action: "CAPTION",
    quotaDayStart: new Date("2026-10-19T00:00:00Z"),
    quotaMonthStart: new Date("2026-10-01T00:00:00Z"),
};

function fakeDatabase({
    monthlyUsed = 0,
    dailyUsed = 0,
    existing = null,
    updateCount = 1,
} = {}) {
    const events = [];

    const tx = {
        $executeRaw: async () => {
            events.push("bucket-sql");
            return 1;
        },

        aiActionRequest: {
            findUnique: async () => existing,
            create: async () => {
                events.push("request-created");
                return { id: "reservation_1", status: "RESERVED" };
            },
        },

        aiQuotaBucket: {
            findUnique: async ({ where }) => {
                const period =
                    where.ownerId_quotaKey_period_periodStart.period;

                return period === "MONTH"
                    ? { id: "month", used: monthlyUsed, limitValue: 20 }
                    : { id: "day", used: dailyUsed, limitValue: 3 };
            },

            updateMany: async () => {
                events.push("quota-increment");
                return { count: updateCount };
            },
        },
    };

    return {
        events,
        prisma: {
            $transaction: async (callback) => callback(tx),
        },
    };
}

describe("Phase 21 atomic AI reservation", () => {
    test("reserves when both quotas allow", async () => {
        const db = fakeDatabase();

        const result = await reserveAiAction({
            prisma: db.prisma,
            identity,
        });

        expect(result.outcome).toBe("RESERVED");
        expect(db.events.filter(
            (event) => event === "quota-increment"
        )).toHaveLength(2);
        expect(db.events).toContain("request-created");
    });

    test("rejects exhausted monthly quota", async () => {
        const db = fakeDatabase({ monthlyUsed: 20 });

        const result = await reserveAiAction({
            prisma: db.prisma,
            identity,
        });

        expect(result.period).toBe("MONTH");
        expect(db.events).not.toContain("request-created");
    });

    test("rejects exhausted daily quota", async () => {
        const db = fakeDatabase({ dailyUsed: 3 });

        const result = await reserveAiAction({
            prisma: db.prisma,
            identity,
        });

        expect(result.period).toBe("DAY");
        expect(db.events).not.toContain("request-created");
    });

    test("returns an existing matching request", async () => {
        const db = fakeDatabase({
            existing: {
                id: "existing_1",
                action: "CAPTION",
                inputHash: identity.inputHash,
                status: "RESERVED",
            },
        });

        const result = await reserveAiAction({
            prisma: db.prisma,
            identity,
        });

        expect(result.outcome).toBe("EXISTING");
        expect(db.events).not.toContain("quota-increment");
    });

    test("rejects a duplicate key with different input", async () => {
        const db = fakeDatabase({
            existing: {
                id: "existing_1",
                action: "CAPTION",
                inputHash: "b".repeat(64),
                status: "RESERVED",
            },
        });

        expect(
            reserveAiAction({
                prisma: db.prisma,
                identity,
            })
        ).rejects.toThrow("AI_IDEMPOTENCY_CONFLICT");
    });
});
