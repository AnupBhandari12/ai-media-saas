const MAX_FILE_SIZE =
    15 * 1024 * 1024;

const MAX_PIXELS =
    40_000_000;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export const MEME_OUTPUT_FORMATS = [
    {
        id: "jpg",
        label: "JPG",
    },
    {
        id: "png",
        label: "PNG",
    },
];

function clamp(
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

function validColor(
    value,
    fallback
) {
    return /^#[0-9a-f]{6}$/i.test(
        value || ""
    )
        ? value
        : fallback;
}

export function normalizeMemeSettings(
    settings = {}
) {
    return {
        topText:
            String(
                settings.topText || ""
            ).slice(0, 120),

        bottomText:
            String(
                settings.bottomText || ""
            ).slice(0, 120),

        customText:
            String(
                settings.customText || ""
            ).slice(0, 120),

        customY:
            clamp(
                settings.customY,
                10,
                90
            ),

        fontScale:
            clamp(
                settings.fontScale,
                4,
                12
            ),

        textColor:
            validColor(
                settings.textColor,
                "#ffffff"
            ),

        outlineColor:
            validColor(
                settings.outlineColor,
                "#000000"
            ),

        uppercase:
            settings.uppercase !==
            false,

        outputFormat:
            settings.outputFormat ===
                "jpg"
                ? "jpg"
                : "png",
    };
}

function getBaseName(
    filename
) {
    const dot =
        filename.lastIndexOf(
            "."
        );

    return dot > 0
        ? filename.slice(
            0,
            dot
        )
        : filename;
}

function canvasToBlob(
    canvas,
    format
) {
    return new Promise(
        (resolve, reject) => {
            const mimeType =
                format === "jpg"
                    ? "image/jpeg"
                    : "image/png";

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "The browser could not create the meme image."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },

                mimeType,

                format === "jpg"
                    ? 0.94
                    : undefined
            );
        }
    );
}

function wrapText(
    context,
    text,
    maxWidth,
    maxLines = 3
) {
    const words =
        text
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (
        words.length === 0
    ) {
        return [];
    }

    const lines = [];

    let current = "";

    for (
        const word of words
    ) {
        const candidate =
            current
                ? `${current} ${word}`
                : word;

        if (
            context.measureText(
                candidate
            ).width <=
            maxWidth
        ) {
            current =
                candidate;

            continue;
        }

        if (current) {
            lines.push(
                current
            );
        }

        current = word;

        if (
            lines.length ===
            maxLines - 1
        ) {
            break;
        }
    }

    if (
        current &&
        lines.length <
        maxLines
    ) {
        lines.push(
            current
        );
    }

    return lines;
}

function drawTextLine(
    context,
    line,
    x,
    y,
    settings,
    fontSize
) {
    context.lineJoin =
        "round";

    context.lineWidth =
        Math.max(
            3,
            fontSize * 0.09
        );

    context.strokeStyle =
        settings.outlineColor;

    context.fillStyle =
        settings.textColor;

    context.strokeText(
        line,
        x,
        y
    );

    context.fillText(
        line,
        x,
        y
    );
}

function drawTextBlock(
    context,
    rawText,
    {
        x,
        startY,
        direction = "DOWN",
        maxWidth,
    },
    settings,
    fontSize
) {
    if (
        !rawText.trim()
    ) {
        return;
    }

    const text =
        settings.uppercase
            ? rawText.toUpperCase()
            : rawText;

    const lines =
        wrapText(
            context,
            text,
            maxWidth,
            3
        );

    const lineHeight =
        fontSize * 1.08;

    if (
        direction === "UP"
    ) {
        [...lines]
            .reverse()
            .forEach(
                (
                    line,
                    index
                ) => {
                    drawTextLine(
                        context,
                        line,
                        x,
                        startY -
                        index *
                        lineHeight,
                        settings,
                        fontSize
                    );
                }
            );

        return;
    }

    lines.forEach(
        (
            line,
            index
        ) => {
            drawTextLine(
                context,
                line,
                x,
                startY +
                index *
                lineHeight,
                settings,
                fontSize
            );
        }
    );
}

export function drawMemeCanvas(
    canvas,
    bitmap,
    rawSettings = {}
) {
    const settings =
        normalizeMemeSettings(
            rawSettings
        );

    canvas.width =
        bitmap.width;

    canvas.height =
        bitmap.height;

    const context =
        canvas.getContext(
            "2d"
        );

    if (!context) {
        throw new Error(
            "Canvas rendering is not supported in this browser."
        );
    }

    if (
        settings.outputFormat ===
        "jpg"
    ) {
        context.fillStyle =
            "#ffffff";

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );
    }

    context.drawImage(
        bitmap,
        0,
        0,
        bitmap.width,
        bitmap.height
    );

    const baseSize =
        Math.min(
            canvas.width,
            canvas.height
        );

    const fontSize =
        Math.round(
            baseSize *
            (settings.fontScale /
                100)
        );

    context.font =
        `900 ${fontSize}px Arial, Helvetica, sans-serif`;

    context.textAlign =
        "center";

    context.textBaseline =
        "top";

    const margin =
        Math.max(
            20,
            baseSize * 0.035
        );

    const maxWidth =
        canvas.width -
        margin * 2;

    drawTextBlock(
        context,
        settings.topText,
        {
            x:
                canvas.width / 2,

            startY:
                margin,

            maxWidth,
        },
        settings,
        fontSize
    );

    context.textBaseline =
        "bottom";

    drawTextBlock(
        context,
        settings.bottomText,
        {
            x:
                canvas.width / 2,

            startY:
                canvas.height -
                margin,

            direction:
                "UP",

            maxWidth,
        },
        settings,
        fontSize
    );

    context.textBaseline =
        "middle";

    drawTextBlock(
        context,
        settings.customText,
        {
            x:
                canvas.width / 2,

            startY:
                canvas.height *
                (settings.customY /
                    100),

            maxWidth,
        },
        settings,
        fontSize
    );

    return settings;
}

export async function renderMemePreview(
    canvas,
    file,
    settings
) {
    if (!file) {
        return;
    }

    const bitmap =
        await createImageBitmap(
            file
        );

    try {
        drawMemeCanvas(
            canvas,
            bitmap,
            settings
        );
    } finally {
        bitmap.close();
    }
}

export async function createMeme(
    file,
    settings
) {
    if (!file) {
        throw new Error(
            "Choose an image first."
        );
    }

    if (
        !ALLOWED_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Image must be JPG, PNG, or WebP."
        );
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "Image must be 15 MB or smaller."
        );
    }

    const bitmap =
        await createImageBitmap(
            file
        );

    try {
        if (
            bitmap.width *
            bitmap.height >
            MAX_PIXELS
        ) {
            throw new Error(
                "This image is too large for safe browser processing."
            );
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        const normalized =
            drawMemeCanvas(
                canvas,
                bitmap,
                settings
            );

        const blob =
            await canvasToBlob(
                canvas,
                normalized.outputFormat
            );

        return {
            blob,

            filename:
                `${getBaseName(
                    file.name
                )}-meme.${normalized.outputFormat}`,

            width:
                canvas.width,

            height:
                canvas.height,

            outputSize:
                blob.size,

            format:
                normalized.outputFormat,
        };
    } finally {
        bitmap.close();
    }
}