
import { describe, expect, test } from "bun:test";

import {
    AI_ACTIONS,
    runAiAction,
} from "../../lib/ai/providerAdapter.mjs";

describe("Phase 21 AI Provider Adapter", () => {
    test("supports planned AI actions", () => {
        expect(Object.values(AI_ACTIONS)).toEqual([
            "CAPTION",
            "ALT_TEXT",
            "BACKGROUND_REMOVE",
        ]);
    });

    test("returns an explicitly labeled mock result", async () => {
        const result = await runAiAction({
            action: "CAPTION",
        });

        expect(result.status).toBe("MOCK_ONLY");
        expect(result.provider).toBe("mock");
        expect(result.costUsd).toBe(0);
    });

    test("rejects unsupported AI actions", async () => {
        await expect(
            runAiAction({ action: "DELETE_DATABASE" })
        ).rejects.toThrow("Unsupported AI action.");
    });

    test("rejects real provider calls for now", async () => {
        await expect(
            runAiAction({
                action: "ALT_TEXT",
                mode: "openai",
            })
        ).rejects.toThrow(
            "Real AI provider is not configured."
        );
    });
});
