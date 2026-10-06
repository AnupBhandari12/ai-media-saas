import { getCoverPlacement } from "@/lib/tools/creator/thumbnailLayout";

const MAX_FILE_SIZE =
    15 * 1024 * 1024;

const MAX_PIXELS =
    40_000_000;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export const POSTER_TEMPLATES = [
    {
        id: "BUSINESS_BANNER",
        name: "Business Banner",
        description:
            "Landscape banner for business announcements and social sharing.",
        width: 1200,
        height: 628,
    },

    {
        id: "SQUARE_PROMO",
        name: "Square Promo",
        description:
            "Square promotional design for Instagram and general social posts.",
        width: 1080,
        height: 1080,
    },

    {
        id: "STORY_PROMO",
        name: "Story Poster",
        description:
            "Vertical poster for stories, offers, events, and announcements.",
        width: 1080,
        height: 1920,
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

export function getPosterTemplate(
    templateId
) {
    return (
        POSTER_TEMPLATES.find(
            (template) =>
                template.id ===
                templateId
        ) ||
        POSTER_TEMPLATES[0]
    );
}

export function normalizePosterSettings(
    settings = {}
) {
    const template =
        getPosterTemplate(
            settings.template
        );

    return {
        template:
            template.id,

        title:
            String(
                settings.title || ""
            )
                .trim()
                .slice(0, 120),

        subtitle:
            String(
                settings.subtitle || ""
            )
                .trim()
                .slice(0, 180),

        cta:
            String(
                settings.cta || ""
            )
                .trim()
                .slice(0, 40),

        focusX:
            clamp(
                settings.focusX,
                0,
                100
            ),

        focusY:
            clamp(
                settings.focusY,
                0,
                100
            ),

        overlayOpacity:
            clamp(
                settings.overlayOpacity,
                10,
                85
            ),

        primaryColor:
            validColor(
                settings.primaryColor,
                "#4f46e5"
            ),

        secondaryColor:
            validColor(
                settings.secondaryColor,
                "#0891b2"
            ),

        textColor:
            validColor(
                settings.textColor,
                "#ffffff"
            ),

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
                                "The browser could not create the poster."
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

function roundedRect(
    context,
    x,
    y,
    width,
    height,
    radius
) {
    context.beginPath();

    context.roundRect(
        x,
        y,
        width,
        height,
        radius
    );
}

function wrapText(
    context,
    text,
    maxWidth,
    maxLines
) {
    const words =
        text
            .split(/\s+/)
            .filter(Boolean);

    const lines = [];

    let current = "";

    for (
        const word of words
    ) {
        const next =
            current
                ? `${current} ${word}`
                : word;

        if (
            context.measureText(
                next
            ).width <=
            maxWidth
        ) {
            current = next;

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

function fitHeading(
    context,
    text,
    maxWidth,
    maxLines,
    maxSize,
    minSize
) {
    for (
        let size = maxSize;
        size >= minSize;
        size -= 4
    ) {
        context.font =
            `800 ${size}px Arial, Helvetica, sans-serif`;

        const lines =
            wrapText(
                context,
                text,
                maxWidth,
                maxLines
            );

        if (
            lines.every(
                (line) =>
                    context.measureText(
                        line
                    ).width <=
                    maxWidth
            )
        ) {
            return {
                size,
                lines,
            };
        }
    }

    context.font =
        `800 ${minSize}px Arial, Helvetica, sans-serif`;

    return {
        size: minSize,

        lines:
            wrapText(
                context,
                text,
                maxWidth,
                maxLines
            ),
    };
}

function drawLogo(
    context,
    logo,
    canvasWidth
) {
    if (!logo) {
        return;
    }

    const maxWidth =
        canvasWidth * 0.16;

    const maxHeight =
        maxWidth * 0.55;

    const scale =
        Math.min(
            maxWidth /
            logo.width,

            maxHeight /
            logo.height,

            1
        );

    const width =
        logo.width * scale;

    const height =
        logo.height * scale;

    context.drawImage(
        logo,
        canvasWidth -
        width -
        55,
        45,
        width,
        height
    );
}

function drawCta(
    context,
    text,
    x,
    y,
    color
) {
    if (!text) {
        return;
    }

    context.font =
        "700 28px Arial, Helvetica, sans-serif";

    const textWidth =
        context.measureText(
            text
        ).width;

    const width =
        textWidth + 52;

    const height = 58;

    roundedRect(
        context,
        x,
        y,
        width,
        height,
        14
    );

    context.fillStyle =
        color;

    context.fill();

    context.fillStyle =
        "#ffffff";

    context.textBaseline =
        "middle";

    context.textAlign =
        "left";

    context.fillText(
        text,
        x + 26,
        y + height / 2
    );
}

function drawLandscape(
    context,
    canvas,
    settings
) {
    const gradient =
        context.createLinearGradient(
            0,
            0,
            canvas.width *
            0.75,
            0
        );

    gradient.addColorStop(
        0,
        `rgba(15,23,42,${settings.overlayOpacity /
        100
        })`
    );

    gradient.addColorStop(
        1,
        "rgba(15,23,42,0.06)"
    );

    context.fillStyle =
        gradient;

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.fillStyle =
        settings.primaryColor;

    context.fillRect(
        64,
        102,
        115,
        10
    );

    const heading =
        fitHeading(
            context,
            settings.title,
            680,
            3,
            72,
            42
        );

    context.fillStyle =
        settings.textColor;

    context.textAlign =
        "left";

    context.textBaseline =
        "top";

    let y = 140;

    for (
        const line of
        heading.lines
    ) {
        context.fillText(
            line,
            64,
            y
        );

        y +=
            heading.size *
            1.06;
    }

    if (
        settings.subtitle
    ) {
        context.font =
            "400 29px Arial, Helvetica, sans-serif";

        context.fillStyle =
            "rgba(255,255,255,0.9)";

        const lines =
            wrapText(
                context,
                settings.subtitle,
                620,
                2
            );

        y += 18;

        for (
            const line of
            lines
        ) {
            context.fillText(
                line,
                64,
                y
            );

            y += 38;
        }
    }

    drawCta(
        context,
        settings.cta,
        64,
        Math.min(
            y + 30,
            520
        ),
        settings.primaryColor
    );
}

function drawSquare(
    context,
    canvas,
    settings
) {
    const gradient =
        context.createLinearGradient(
            0,
            canvas.height *
            0.35,
            0,
            canvas.height
        );

    gradient.addColorStop(
        0,
        "rgba(15,23,42,0)"
    );

    gradient.addColorStop(
        1,
        `rgba(15,23,42,${settings.overlayOpacity /
        100
        })`
    );

    context.fillStyle =
        gradient;

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.fillStyle =
        settings.primaryColor;

    context.fillRect(
        72,
        685,
        12,
        230
    );

    const heading =
        fitHeading(
            context,
            settings.title,
            850,
            3,
            78,
            44
        );

    context.textAlign =
        "left";

    context.textBaseline =
        "top";

    context.fillStyle =
        settings.textColor;

    let y = 680;

    for (
        const line of
        heading.lines
    ) {
        context.fillText(
            line,
            112,
            y
        );

        y +=
            heading.size *
            1.05;
    }

    if (
        settings.subtitle
    ) {
        context.font =
            "400 29px Arial, Helvetica, sans-serif";

        context.fillStyle =
            "rgba(255,255,255,0.9)";

        context.fillText(
            settings.subtitle,
            114,
            Math.min(
                y + 15,
                950
            )
        );
    }

    drawCta(
        context,
        settings.cta,
        114,
        955,
        settings.primaryColor
    );
}

function drawStory(
    context,
    canvas,
    settings
) {
    const gradient =
        context.createLinearGradient(
            0,
            0,
            0,
            canvas.height
        );

    gradient.addColorStop(
        0,
        `rgba(15,23,42,${settings.overlayOpacity /
        180
        })`
    );

    gradient.addColorStop(
        0.45,
        "rgba(15,23,42,0.10)"
    );

    gradient.addColorStop(
        1,
        `rgba(15,23,42,${settings.overlayOpacity /
        100
        })`
    );

    context.fillStyle =
        gradient;

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.fillStyle =
        settings.primaryColor;

    context.fillRect(
        70,
        310,
        130,
        12
    );

    const heading =
        fitHeading(
            context,
            settings.title,
            880,
            4,
            92,
            50
        );

    context.fillStyle =
        settings.textColor;

    context.textAlign =
        "left";

    context.textBaseline =
        "top";

    let y = 360;

    for (
        const line of
        heading.lines
    ) {
        context.fillText(
            line,
            70,
            y
        );

        y +=
            heading.size *
            1.05;
    }

    if (
        settings.subtitle
    ) {
        context.font =
            "400 36px Arial, Helvetica, sans-serif";

        context.fillStyle =
            "rgba(255,255,255,0.9)";

        const lines =
            wrapText(
                context,
                settings.subtitle,
                850,
                3
            );

        y += 35;

        for (
            const line of
            lines
        ) {
            context.fillText(
                line,
                72,
                y
            );

            y += 48;
        }
    }

    drawCta(
        context,
        settings.cta,
        72,
        1680,
        settings.primaryColor
    );
}

export async function createPosterBanner(
    file,
    {
        settings,
        brandKit,
    } = {}
) {
    if (!file) {
        throw new Error(
            "Choose a background image."
        );
    }

    if (
        !ALLOWED_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Background image must be JPG, PNG, or WebP."
        );
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "Background image must be 15 MB or smaller."
        );
    }

    const bitmap =
        await createImageBitmap(
            file
        );

    let logoBitmap = null;

    try {
        if (
            bitmap.width *
            bitmap.height >
            MAX_PIXELS
        ) {
            throw new Error(
                "This background image is too large for safe browser processing."
            );
        }

        const normalized =
            normalizePosterSettings({
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

        const template =
            getPosterTemplate(
                normalized.template
            );

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

        canvas.width =
            template.width;

        canvas.height =
            template.height;

        const context =
            canvas.getContext(
                "2d"
            );

        if (!context) {
            throw new Error(
                "Canvas rendering is not supported."
            );
        }

        const placement =
            getCoverPlacement(
                bitmap.width,
                bitmap.height,
                canvas.width,
                canvas.height,
                normalized.focusX,
                normalized.focusY
            );

        context.drawImage(
            bitmap,
            placement.x,
            placement.y,
            placement.width,
            placement.height
        );

        if (
            template.id ===
            "SQUARE_PROMO"
        ) {
            drawSquare(
                context,
                canvas,
                normalized
            );
        } else if (
            template.id ===
            "STORY_PROMO"
        ) {
            drawStory(
                context,
                canvas,
                normalized
            );
        } else {
            drawLandscape(
                context,
                canvas,
                normalized
            );
        }

        if (
            normalized.useBrandKit &&
            normalized.showLogo &&
            logoBitmap
        ) {
            drawLogo(
                context,
                logoBitmap,
                canvas.width
            );
        }

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
                )}-${template.id.toLowerCase()}.${normalized.outputFormat}`,

            width:
                template.width,

            height:
                template.height,

            outputSize:
                blob.size,

            format:
                normalized.outputFormat,

            template:
                template.id,

            templateName:
                template.name,

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
        bitmap.close();

        logoBitmap?.close();
    }
}