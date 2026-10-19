
export const AI_TEXT_PRICES = Object.freeze({
    "gpt-6-luna": Object.freeze({
        inputPerMillion: 0.10,
        outputPerMillion: 0.50,
    }),
});

export function estimateAiTextCost({
    model,
    inputTokens,
    outputTokens,
}) {
    const price = AI_TEXT_PRICES[model];

    if (!price) {
        throw new Error("Unsupported AI pricing model.");
    }

    for (const tokens of [inputTokens, outputTokens]) {
        if (!Number.isSafeInteger(tokens) || tokens < 0) {
            throw new Error("Invalid AI token usage.");
        }
    }

    const inputCost =
        (inputTokens * price.inputPerMillion) / 1_000_000;

    const outputCost =
        (outputTokens * price.outputPerMillion) / 1_000_000;

    return {
        model,
        inputTokens,
        outputTokens,
        estimatedCostUsd: Number(
            (inputCost + outputCost).toFixed(8)
        ),
    };
}
