
import { describe, expect, test } from "bun:test";

import {
    buildAiReservationIdentity,
} from "../../lib/ai/aiReservationIdentity.mjs";

const request = {
    ownerId: "user_test123",
    idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
    action: "CAPTION",
    input: "A mountain landscape photograph",
    now: new Date("2026-10-19T23:30:00.000Z"),
};

describe("Phase 21 AI reservation identity", () => {
    test("builds a valid reservation identity", () => {
        const result = buildAiReservationIdentity(request);

        expect(result.action).toBe("CAPTION");
        expect(result.quotaKey).toBe("AI_ACTION");
        expect(result.inputHash).toHaveLength(64);
    });

    test("same request produces the same hash", () => {
        const first = buildAiReservationIdentity(request);
        const second = buildAiReservationIdentity(request);

        expect(first.inputHash).toBe(second.inputHash);
    });

    test("different input produces a different hash", () => {
        const first = buildAiReservationIdentity(request);

        const second = buildAiReservationIdentity({
            ...request,
            input: "A photograph of a city skyline",
        });

        expect(first.inputHash).not.toBe(second.inputHash);
    });

    test("uses UTC day and month boundaries", () => {
        const result = buildAiReservationIdentity(request);

        expect(result.quotaDayStart.toISOString()).toBe(
            "2026-10-19T00:00:00.000Z"
        );

        expect(result.quotaMonthStart.toISOString()).toBe(
            "2026-10-01T00:00:00.000Z"
        );
    });

    test("rejects an invalid request ID", () => {
        expect(() =>
            buildAiReservationIdentity({
                ...request,
                idempotencyKey: "not-a-uuid",
            })
        ).toThrow("Valid request UUID is required.");
    });

    test("rejects missing authentication identity", () => {
        expect(() =>
            buildAiReservationIdentity({
                ...request,
                ownerId: "",
            })
        ).toThrow("Authenticated owner is required.");
    });

    test("rejects unsupported actions", () => {
        expect(() =>
            buildAiReservationIdentity({
                ...request,
                action: "UNKNOWN_ACTION",
            })
        ).toThrow("Unsupported text AI action.");
    });
});
