
import { describe, expect, test } from "bun:test";

import {
    OPENAI_TEXT_MODEL,
    buildCaptionRequest,
    runOpenAiCaption,
} from "../../lib/ai/openaiProvider.mjs";

describe("Phase 21 OpenAI provider", () => {
    test("uses the low-cost model", () => {
        expect(OPENAI_TEXT_MODEL).toBe("gpt-6-luna");
    });

    test("builds a bounded private request", () => {
        const request = buildCaptionRequest(
            "A sunset photo over the mountains"
        );

        expect(request.model).toBe("gpt-6-luna");
        expect(request.store).toBe(false);
        expect(request.max_output_tokens).toBe(220);
    });

    test("rejects invalid descriptions", () => {
        expect(() => buildCaptionRequest("")).toThrow();
        expect(() => buildCaptionRequest("x".repeat(1201))).toThrow();
    });

    test("real requests are disabled by default", async () => {
        let called = false;

        await expect(
            runOpenAiCaption({
                description: "A mountain sunset",
                apiKey: "fake-test-key",
                fetchFn: async () => {
                    called = true;
                    throw new Error("Network must not run.");
                },
            })
        ).rejects.toThrow("Real AI requests are disabled.");

        expect(called).toBe(false);
    });

    test("reads a fake API response without network", async () => {
        const fakeFetch = async (url, options) => {
            expect(url).toBe("https://api.openai.com/v1/responses");
            expect(JSON.parse(options.body).store).toBe(false);

            return {
                ok: true,
                status: 200,
                json: async () => ({
                    status: "completed",
                    output: [{
                        type: "message",
                        content: [{
                            type: "output_text",
                            text: "Golden skies over quiet mountains.",
                        }],
                    }],
                    usage: {
                        input_tokens: 30,
                        output_tokens: 12,
                    },
                }),
            };
        };

        const result = await runOpenAiCaption({
            description: "A mountain sunset",
            enabled: true,
            apiKey: "fake-test-key",
            fetchFn: fakeFetch,
        });

        expect(result.text).toBe(
            "Golden skies over quiet mountains."
        );
        expect(result.usage.inputTokens).toBe(30);
        expect(result.usage.outputTokens).toBe(12);
    });
});
