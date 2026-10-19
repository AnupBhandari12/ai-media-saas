
import { AI_ACTIONS } from "./providerAdapter.mjs";

export const OPENAI_TEXT_MODEL = "gpt-6-luna";

export function buildCaptionRequest(description) {
    if (typeof description !== "string") {
        throw new Error("Description must be text.");
    }

    const text = description.trim();

    if (text.length < 3 || text.length > 1200) {
        throw new Error("Description must be 3–1200 characters.");
    }

    return {
        model: OPENAI_TEXT_MODEL,
        store: false,
        reasoning: { effort: "none" },
        max_output_tokens: 220,
        instructions:
            "Write one short, natural social media caption. " +
            "Use only the user's description. " +
            "Do not claim you analyzed an image.",
        input: text,
    };
}

// SERVER ONLY. Never import into a client component.
export async function runOpenAiCaption({
    description,
    enabled = false,
    apiKey = process.env.OPENAI_API_KEY,
    fetchFn = fetch,
} = {}) {
    if (!enabled) {
        throw new Error("Real AI requests are disabled.");
    }

    const body = buildCaptionRequest(description);

    if (!apiKey || typeof apiKey !== "string") {
        throw new Error("OpenAI API key is not configured.");
    }

    const response = await fetchFn(
        "https://api.openai.com/v1/responses",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
        }
    );

    if (!response.ok) {
        throw new Error(
            `OpenAI request failed with status ${response.status}.`
        );
    }

    const data = await response.json();

    if (data.status !== "completed") {
        throw new Error("OpenAI response was not completed.");
    }

    const text = (data.output || [])
        .filter((item) => item.type === "message")
        .flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text)
        .join("\n")
        .trim();

    if (!text) {
        throw new Error("OpenAI returned no text.");
    }

    return {
        status: "SUCCESS",
        action: AI_ACTIONS.CAPTION,
        provider: "openai",
        model: OPENAI_TEXT_MODEL,
        text,
        usage: {
            inputTokens: data.usage?.input_tokens ?? 0,
            outputTokens: data.usage?.output_tokens ?? 0,
        },
    };
}
