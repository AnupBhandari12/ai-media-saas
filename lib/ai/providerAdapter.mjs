
export const AI_ACTIONS = Object.freeze({
    CAPTION: "CAPTION",
    ALT_TEXT: "ALT_TEXT",
    BACKGROUND_REMOVE: "BACKGROUND_REMOVE",
});

export async function runAiAction({
    action,
    mode = "mock",
}) {
    const allowedActions = Object.values(AI_ACTIONS);

    if (!allowedActions.includes(action)) {
        throw new Error("Unsupported AI action.");
    }

    if (mode !== "mock") {
        throw new Error("Real AI provider is not configured.");
    }

    return {
        status: "MOCK_ONLY",
        action,
        provider: "mock",
        message: "Demo only. No AI model was called.",
        costUsd: 0,
    };
}
