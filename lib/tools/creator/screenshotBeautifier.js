export const SCREENSHOT_THEMES = [
    {
        id: "INDIGO",
        name: "Indigo Glow",
        start: "#4338ca",
        end: "#06b6d4",
    },
    {
        id: "SUNSET",
        name: "Sunset",
        start: "#f97316",
        end: "#db2777",
    },
    {
        id: "OCEAN",
        name: "Ocean",
        start: "#0f766e",
        end: "#2563eb",
    },
    {
        id: "SLATE",
        name: "Dark Slate",
        start: "#0f172a",
        end: "#334155",
    },
    {
        id: "LIGHT",
        name: "Soft Light",
        start: "#e2e8f0",
        end: "#f8fafc",
    },
];

export const SCREENSHOT_FRAMES = [
    {
        id: "CARD",
        name: "Rounded Card",
    },
    {
        id: "BROWSER",
        name: "Browser Window",
    },
    {
        id: "NONE",
        name: "No Frame",
    },
];

export const SCREENSHOT_PADDING_OPTIONS = [
    {
        value: 48,
        label: "Small",
    },
    {
        value: 96,
        label: "Medium",
    },
    {
        value: 144,
        label: "Large",
    },
];

export function clampScreenshotValue(
    value,
    min,
    max
) {
    const number =
        Number(value);

    if (
        !Number.isFinite(
            number
        )
    ) {
        return min;
    }

    return Math.min(
        max,
        Math.max(
            min,
            number
        )
    );
}

export function normalizeScreenshotSettings(
    settings = {}
) {
    const theme =
        SCREENSHOT_THEMES.some(
            (item) =>
                item.id ===
                settings.theme
        )
            ? settings.theme
            : "INDIGO";

    const frame =
        SCREENSHOT_FRAMES.some(
            (item) =>
                item.id ===
                settings.frame
        )
            ? settings.frame
            : "CARD";

    const paddingValues =
        SCREENSHOT_PADDING_OPTIONS.map(
            (item) =>
                item.value
        );

    const padding =
        paddingValues.includes(
            Number(
                settings.padding
            )
        )
            ? Number(
                settings.padding
            )
            : 96;

    return {
        theme,
        frame,
        padding,

        cornerRadius:
            clampScreenshotValue(
                settings.cornerRadius,
                0,
                48
            ),

        shadowStrength:
            clampScreenshotValue(
                settings.shadowStrength,
                0,
                100
            ),

        backgroundAngle:
            clampScreenshotValue(
                settings.backgroundAngle,
                0,
                360
            ),

        outputFormat:
            settings.outputFormat ===
                "jpg"
                ? "jpg"
                : "png",
    };
}

export function getBeautifiedDimensions(
    sourceWidth,
    sourceHeight,
    {
        padding = 96,
        frame = "CARD",
    } = {}
) {
    const browserBarHeight =
        frame === "BROWSER"
            ? 72
            : 0;

    return {
        width:
            sourceWidth +
            padding * 2,

        height:
            sourceHeight +
            browserBarHeight +
            padding * 2,

        browserBarHeight,
    };
}