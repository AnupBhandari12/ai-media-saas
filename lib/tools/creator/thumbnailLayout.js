export const YOUTUBE_THUMBNAIL_WIDTH = 1280;
export const YOUTUBE_THUMBNAIL_HEIGHT = 720;

export const THUMBNAIL_TEMPLATES = [
    {
        id: "BOLD_LEFT",
        name: "Bold Left",
        description:
            "Large left-aligned title with a strong readable overlay.",
    },
    {
        id: "CENTERED",
        name: "Centered",
        description:
            "Centered title for clean announcement-style thumbnails.",
    },
    {
        id: "CLEAN_BOTTOM",
        name: "Clean Bottom",
        description:
            "Keep the image visible and place text in a bottom overlay.",
    },
];

export function clampNumber(
    value,
    min,
    max
) {
    const number =
        Number(value);

    if (
        !Number.isFinite(number)
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

export function normalizeThumbnailSettings(
    settings = {}
) {
    const validTemplate =
        THUMBNAIL_TEMPLATES.some(
            (template) =>
                template.id ===
                settings.template
        );

    return {
        template:
            validTemplate
                ? settings.template
                : "BOLD_LEFT",

        title:
            String(
                settings.title || ""
            )
                .trim()
                .slice(0, 100),

        subtitle:
            String(
                settings.subtitle || ""
            )
                .trim()
                .slice(0, 140),

        focusX:
            clampNumber(
                settings.focusX,
                0,
                100
            ),

        focusY:
            clampNumber(
                settings.focusY,
                0,
                100
            ),

        overlayOpacity:
            clampNumber(
                settings.overlayOpacity,
                0,
                80
            ),

        titleColor:
            /^#[0-9a-f]{6}$/i.test(
                settings.titleColor || ""
            )
                ? settings.titleColor
                : "#ffffff",

        primaryColor:
            /^#[0-9a-f]{6}$/i.test(
                settings.primaryColor || ""
            )
                ? settings.primaryColor
                : "#4f46e5",

        secondaryColor:
            /^#[0-9a-f]{6}$/i.test(
                settings.secondaryColor || ""
            )
                ? settings.secondaryColor
                : "#0891b2",

        useBrandKit:
            Boolean(
                settings.useBrandKit
            ),

        showLogo:
            Boolean(
                settings.showLogo
            ),

        outputFormat:
            settings.outputFormat ===
                "png"
                ? "png"
                : "jpg",
    };
}

export function getCoverPlacement(
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    focusX = 50,
    focusY = 50
) {
    const scale = Math.max(
        targetWidth / sourceWidth,
        targetHeight / sourceHeight
    );

    const width =
        sourceWidth * scale;

    const height =
        sourceHeight * scale;

    const overflowX =
        Math.max(
            0,
            width - targetWidth
        );

    const overflowY =
        Math.max(
            0,
            height - targetHeight
        );

    const normalizedFocusX =
        clampNumber(
            focusX,
            0,
            100
        ) / 100;

    const normalizedFocusY =
        clampNumber(
            focusY,
            0,
            100
        ) / 100;

    const rawX =
        -overflowX *
        normalizedFocusX;

    const rawY =
        -overflowY *
        normalizedFocusY;

    return {
        x:
            Object.is(
                rawX,
                -0
            )
                ? 0
                : rawX,

        y:
            Object.is(
                rawY,
                -0
            )
                ? 0
                : rawY,

        width,
        height,
    };
}