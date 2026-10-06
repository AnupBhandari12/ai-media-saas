import {
    YOUTUBE_THUMBNAIL_HEIGHT,
    YOUTUBE_THUMBNAIL_WIDTH,
    getCoverPlacement,
    normalizeThumbnailSettings,
} from "@/lib/tools/creator/thumbnailLayout";

const MAX_FILE_SIZE =
    15 * 1024 * 1024;

const MAX_PIXELS =
    40_000_000;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

function getBaseName(name) {
    const dot =
        name.lastIndexOf(".");

    return dot > 0
        ? name.slice(0, dot)
        : name;
}

function canvasToBlob(
    canvas,
    format
) {
    return new Promise(
        (resolve, reject) => {
            const mimeType =
                format === "png"
                    ? "image/png"
                    : "image/jpeg";

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "The browser could not create the thumbnail."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },
                mimeType,
                format === "jpg"
                    ? 0.92
                    : undefined
            );
        }
    );
}

async function loadRemoteBitmap(
    url
) {
    if (!url) {
        return null;
    }

    const response =
        await fetch(url);

    if (!response.ok) {
        throw new Error(
            "Saved Brand Kit logo could not be loaded."
        );
    }

    const blob =
        await response.blob();

    return createImageBitmap(
        blob
    );
}

function hexToRgba(
    hex,
    opacity
) {
    const normalized =
        hex.replace(
            "#",
            ""
        );

    const red =
        parseInt(
            normalized.slice(
                0,
                2
            ),
            16
        );

    const green =
        parseInt(
            normalized.slice(
                2,
                4
            ),
            16
        );

    const blue =
        parseInt(
            normalized.slice(
                4,
                6
            ),
            16
        );

    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function getWrappedLines(
    context,
    text,
    maxWidth,
    maxLines
) {
    const words =
        text.split(/\s+/);

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

    const usedWords =
        lines
            .join(" ")
            .split(/\s+/)
            .filter(Boolean)
            .length;

    if (
        usedWords <
        words.length &&
        lines.length > 0
    ) {
        const lastIndex =
            lines.length - 1;

        let finalLine =
            lines[lastIndex];

        while (
            finalLine.length >
            1 &&
            context.measureText(
                `${finalLine}…`
            ).width >
            maxWidth
        ) {
            finalLine =
                finalLine.slice(
                    0,
                    -1
                );
        }

        lines[lastIndex] =
            `${finalLine.trim()}…`;
    }

    return lines;
}

function fitTitle(
    context,
    text,
    maxWidth,
    maxLines
) {
    for (
        let fontSize = 86;
        fontSize >= 42;
        fontSize -= 4
    ) {
        context.font =
            `800 ${fontSize}px Arial, Helvetica, sans-serif`;

        const lines =
            getWrappedLines(
                context,
                text,
                maxWidth,
                maxLines
            );

        const fits =
            lines.every(
                (line) =>
                    context.measureText(
                        line
                    ).width <=
                    maxWidth
            );

        if (fits) {
            return {
                fontSize,
                lines,
            };
        }
    }

    context.font =
        "800 42px Arial, Helvetica, sans-serif";

    return {
        fontSize: 42,

        lines:
            getWrappedLines(
                context,
                text,
                maxWidth,
                maxLines
            ),
    };
}

function drawLogo(
    context,
    logoBitmap
) {
    if (!logoBitmap) {
        return;
    }

    const maxWidth = 190;
    const maxHeight = 95;

    const scale =
        Math.min(
            maxWidth /
            logoBitmap.width,

            maxHeight /
            logoBitmap.height,

            1
        );

    const width =
        logoBitmap.width *
        scale;

    const height =
        logoBitmap.height *
        scale;

    const x =
        YOUTUBE_THUMBNAIL_WIDTH -
        width -
        64;

    const y = 52;

    context.save();

    context.shadowColor =
        "rgba(0,0,0,0.25)";

    context.shadowBlur = 10;

    context.drawImage(
        logoBitmap,
        x,
        y,
        width,
        height
    );

    context.restore();
}

function drawBoldLeft(
    context,
    settings
) {
    const gradient =
        context.createLinearGradient(
            0,
            0,
            840,
            0
        );

    gradient.addColorStop(
        0,
        `rgba(0,0,0,${settings.overlayOpacity /
        100
        })`
    );

    gradient.addColorStop(
        0.65,
        `rgba(0,0,0,${settings.overlayOpacity /
        160
        })`
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    context.fillStyle =
        gradient;

    context.fillRect(
        0,
        0,
        900,
        YOUTUBE_THUMBNAIL_HEIGHT
    );

    context.fillStyle =
        settings.primaryColor;

    context.fillRect(
        64,
        105,
        115,
        12
    );

    const title =
        fitTitle(
            context,
            settings.title,
            720,
            3
        );

    context.fillStyle =
        settings.titleColor;

    context.textAlign =
        "left";

    context.textBaseline =
        "top";

    let y = 145;

    for (
        const line of
        title.lines
    ) {
        context.fillText(
            line,
            64,
            y
        );

        y +=
            title.fontSize *
            1.05;
    }

    if (
        settings.subtitle
    ) {
        context.font =
            "500 31px Arial, Helvetica, sans-serif";

        context.fillStyle =
            "rgba(255,255,255,0.9)";

        const subtitleLines =
            getWrappedLines(
                context,
                settings.subtitle,
                650,
                2
            );

        y += 18;

        for (
            const line of
            subtitleLines
        ) {
            context.fillText(
                line,
                66,
                y
            );

            y += 38;
        }
    }
}

function drawCentered(
    context,
    settings
) {
    context.fillStyle =
        `rgba(0,0,0,${settings.overlayOpacity /
        115
        })`;

    context.fillRect(
        0,
        0,
        YOUTUBE_THUMBNAIL_WIDTH,
        YOUTUBE_THUMBNAIL_HEIGHT
    );

    const title =
        fitTitle(
            context,
            settings.title,
            1000,
            3
        );

    context.textAlign =
        "center";

    context.textBaseline =
        "middle";

    context.fillStyle =
        settings.titleColor;

    const lineHeight =
        title.fontSize *
        1.08;

    const blockHeight =
        title.lines.length *
        lineHeight;

    let y =
        YOUTUBE_THUMBNAIL_HEIGHT /
        2 -
        blockHeight / 2;

    for (
        const line of
        title.lines
    ) {
        context.fillText(
            line,
            YOUTUBE_THUMBNAIL_WIDTH /
            2,
            y
        );

        y += lineHeight;
    }

    if (
        settings.subtitle
    ) {
        context.font =
            "500 30px Arial, Helvetica, sans-serif";

        context.fillStyle =
            "rgba(255,255,255,0.9)";

        context.fillText(
            settings.subtitle,
            YOUTUBE_THUMBNAIL_WIDTH /
            2,
            y + 25
        );
    }

    context.fillStyle =
        settings.primaryColor;

    context.fillRect(
        490,
        585,
        300,
        8
    );
}

function drawCleanBottom(
    context,
    settings
) {
    const gradient =
        context.createLinearGradient(
            0,
            300,
            0,
            720
        );

    gradient.addColorStop(
        0,
        "rgba(0,0,0,0)"
    );

    gradient.addColorStop(
        1,
        `rgba(0,0,0,${Math.max(
            0.6,
            settings.overlayOpacity /
            100
        )
        })`
    );

    context.fillStyle =
        gradient;

    context.fillRect(
        0,
        250,
        1280,
        470
    );

    context.fillStyle =
        settings.primaryColor;

    context.fillRect(
        64,
        506,
        12,
        125
    );

    const title =
        fitTitle(
            context,
            settings.title,
            1030,
            2
        );

    context.fillStyle =
        settings.titleColor;

    context.textAlign =
        "left";

    context.textBaseline =
        "top";

    let y = 495;

    for (
        const line of
        title.lines
    ) {
        context.fillText(
            line,
            100,
            y
        );

        y +=
            title.fontSize *
            1.02;
    }

    if (
        settings.subtitle
    ) {
        context.font =
            "500 27px Arial, Helvetica, sans-serif";

        context.fillStyle =
            "rgba(255,255,255,0.9)";

        context.fillText(
            settings.subtitle,
            102,
            Math.min(
                y + 10,
                655
            )
        );
    }
}

export function drawYouTubeThumbnail(
    canvas,
    sourceBitmap,
    logoBitmap,
    rawSettings
) {
    const settings =
        normalizeThumbnailSettings(
            rawSettings
        );

    canvas.width =
        YOUTUBE_THUMBNAIL_WIDTH;

    canvas.height =
        YOUTUBE_THUMBNAIL_HEIGHT;

    const context =
        canvas.getContext(
            "2d"
        );

    if (!context) {
        throw new Error(
            "Canvas rendering is not supported in this browser."
        );
    }

    context.fillStyle =
        "#111827";

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    const placement =
        getCoverPlacement(
            sourceBitmap.width,
            sourceBitmap.height,
            canvas.width,
            canvas.height,
            settings.focusX,
            settings.focusY
        );

    context.drawImage(
        sourceBitmap,
        placement.x,
        placement.y,
        placement.width,
        placement.height
    );

    if (
        settings.template ===
        "CENTERED"
    ) {
        drawCentered(
            context,
            settings
        );
    } else if (
        settings.template ===
        "CLEAN_BOTTOM"
    ) {
        drawCleanBottom(
            context,
            settings
        );
    } else {
        drawBoldLeft(
            context,
            settings
        );
    }

    if (
        settings.useBrandKit &&
        settings.showLogo &&
        logoBitmap
    ) {
        drawLogo(
            context,
            logoBitmap
        );
    }

    return settings;
}

export async function createYouTubeThumbnail(
    file,
    {
        settings,
        brandKit,
    } = {}
) {
    if (!file) {
        throw new Error(
            "Choose a source image."
        );
    }

    if (
        !ALLOWED_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Source image must be JPG, PNG, or WebP."
        );
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "Source image must be 15 MB or smaller."
        );
    }

    const sourceBitmap =
        await createImageBitmap(
            file
        );

    let logoBitmap = null;

    try {
        if (
            sourceBitmap.width *
            sourceBitmap.height >
            MAX_PIXELS
        ) {
            throw new Error(
                "This image is too large for safe browser processing."
            );
        }

        const normalized =
            normalizeThumbnailSettings({
                ...settings,

                primaryColor:
                    settings
                        ?.useBrandKit
                        ? brandKit
                            ?.primaryColor ||
                        settings
                            ?.primaryColor
                        : settings
                            ?.primaryColor,

                secondaryColor:
                    settings
                        ?.useBrandKit
                        ? brandKit
                            ?.secondaryColor ||
                        settings
                            ?.secondaryColor
                        : settings
                            ?.secondaryColor,
            });

        if (
            normalized.useBrandKit &&
            normalized.showLogo &&
            brandKit?.logoSecureUrl
        ) {
            logoBitmap =
                await loadRemoteBitmap(
                    brandKit.logoSecureUrl
                );
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        drawYouTubeThumbnail(
            canvas,
            sourceBitmap,
            logoBitmap,
            normalized
        );

        const blob =
            await canvasToBlob(
                canvas,
                normalized.outputFormat
            );

        const extension =
            normalized.outputFormat;

        return {
            blob,

            filename:
                `${getBaseName(
                    file.name
                )}-youtube-thumbnail.${extension}`,

            width:
                YOUTUBE_THUMBNAIL_WIDTH,

            height:
                YOUTUBE_THUMBNAIL_HEIGHT,

            outputSize:
                blob.size,

            format:
                normalized.outputFormat,

            template:
                normalized.template,

            brandKitApplied:
                normalized.useBrandKit,

            logoApplied:
                Boolean(
                    normalized.useBrandKit &&
                    normalized.showLogo &&
                    logoBitmap
                ),
        };
    } finally {
        sourceBitmap.close();

        logoBitmap?.close();
    }
}