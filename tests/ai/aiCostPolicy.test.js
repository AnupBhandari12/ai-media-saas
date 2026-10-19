
import { describe, expect, test } from "bun:test";

import {
    estimateAiTextCost,
} from "../../lib/ai/aiCostPolicy.mjs";

describe("Phase 21 AI cost policy", () => {
    test("calculates Luna text cost", () => {
        const result = estimateAiTextCost({
            model: "gpt-6-luna",
            inputTokens: 1000,
            outputTokens: 200,
        });

        expect(result.estimatedCostUsd).toBe(0.0002);
    });

    test("zero tokens cost zero", () => {
        const result = estimateAiTextCost({
            model: "gpt-6-luna",
            inputTokens: 0,
            outputTokens: 0,
        });

        expect(result.estimatedCostUsd).toBe(0);
    });

    test("rejects unsupported models", () => {
        expect(() =>
            estimateAiTextCost({
                model: "unknown-model",
                inputTokens: 100,
                outputTokens: 50,
            })
        ).toThrow("Unsupported AI pricing model.");
    });

    test("rejects negative token counts", () => {
        expect(() =>
            estimateAiTextCost({
                model: "gpt-6-luna",
                inputTokens: -1,
                outputTokens: 50,
            })
        ).toThrow("Invalid AI token usage.");
    });

    test("rejects fractional token counts", () => {
        expect(() =>
            estimateAiTextCost({
                model: "gpt-6-luna",
                inputTokens: 1.5,
                outputTokens: 50,
            })
        ).toThrow("Invalid AI token usage.");
    });
});
