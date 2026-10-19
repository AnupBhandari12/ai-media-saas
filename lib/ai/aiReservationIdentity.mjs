
import { createHash } from "node:crypto";

import { AI_QUOTA_KEY } from "./aiQuotaPolicy.mjs";

const TEXT_ACTIONS = new Set(["CAPTION", "ALT_TEXT"]);

const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildAiReservationIdentity({
    ownerId,
    idempotencyKey,
    action,
    input,
    now = new Date(),
}) {
    if (typeof ownerId !== "string" || !ownerId.trim()) {
        throw new Error("Authenticated owner is required.");
    }

    if (
        typeof idempotencyKey !== "string" ||
        !UUID_V4.test(idempotencyKey)
    ) {
        throw new Error("Valid request UUID is required.");
    }

    if (!TEXT_ACTIONS.has(action)) {
        throw new Error("Unsupported text AI action.");
    }

    if (typeof input !== "string") {
        throw new Error("AI input must be text.");
    }

    const normalizedInput = input.trim();

    if (normalizedInput.length < 3 || normalizedInput.length > 1200) {
        throw new Error("AI input must contain 3 to 1200 characters.");
    }

    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new Error("Invalid request date.");
    }

    const inputHash = createHash("sha256")
        .update(JSON.stringify({ action, input: normalizedInput }))
        .digest("hex");

    const quotaDayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );

    const quotaMonthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    return {
        ownerId: ownerId.trim(),
        idempotencyKey: idempotencyKey.toLowerCase(),
        action,
        inputHash,
        quotaKey: AI_QUOTA_KEY,
        quotaDayStart,
        quotaMonthStart,
    };
}
