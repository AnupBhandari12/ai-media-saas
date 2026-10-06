import {
    SCREENSHOT_THEMES,
    getBeautifiedDimensions,
    normalizeScreenshotSettings,
} from "@/lib/tools/creator/screenshotBeautifier";

const MAX_FILE_SIZE =
    15 * 1024 * 1024;

const MAX_SOURCE_PIXELS =
    30_000_000;

const MAX_OUTPUT_PIXELS =
    45_000_000;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

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
                                "The browser could not create the screenshot image."
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

function roundedRectPath(
    context,
    x,
    y,
    width,
    height,
    radius
) {
    const safeRadius =
        Math.min(
            radius,
            width / 2,
            height / 2
        );

    context.beginPath();

    context.moveTo(
        x + safeRadius,
        y
    );

    context.lineTo(
        x +
        width -
        safeRadius,
        y
    );

    context.quadraticCurveTo(
        x + width,
        y,
        x + width,
        y + safeRadius
    );

    context.lineTo(
        x + width,
        y +
        height -
        safeRadius
    );

    context.quadraticCurveTo(
        x + width,
        y + height,
        x +
        width -
        safeRadius,
        y + height
    );

    context.lineTo(
        x + safeRadius,
        y + height
    );

    context.quadraticCurveTo(
        x,
        y + height,
        x,
        y +
        height -
        safeRadius
    );

    context.lineTo(
        x,
        y + safeRadius
    );

    context.quadraticCurveTo(
        x,
        y,
        x + safeRadius,
        y
    );

    context.closePath();
}

function createBackgroundGradient(
    context,
    width,
    height,
    theme,
    angle
) {
    const radians =
        (angle *
            Math.PI) /
        180;

    const centerX =
        width / 2;

    const centerY =
        height / 2;

    const distance =
        Math.abs(
            width *
            Math.cos(
                radians
            )
        ) +
        Math.abs(
            height *
            Math.sin(
                radians
            )
        );

    const x1 =
        centerX -
        (Math.cos(
            radians
        ) *
            distance) /
        2;

    const y1 =
        centerY -
        (Math.sin(
            radians
        ) *
            distance) /
        2;

    const x2 =
        centerX +
        (Math.cos(
            radians
        ) *
            distance) /
        2;

    const y2 =
        centerY +
        (Math.sin(
            radians
        ) *
            distance) /
        2;

    const gradient =
        context.createLinearGradient(
            x1,
            y1,
            x2,
            y2
        );

    gradient.addColorStop(
        0,
        theme.start
    );

    gradient.addColorStop(
        1,
        theme.end
    );

    return gradient;
}

function drawBrowserBar(
    context,
    x,
    y,
    width,
    height
) {
    context.fillStyle =
        "#f8fafc";

    context.fillRect(
        x,
        y,
        width,
        height
    );

    const centerY =
        y + height / 2;

    const radius = 10;

    const circles = [
        "#ef4444",
        "#f59e0b",
        "#22c55e",
    ];

    circles.forEach(
        (
            color,
            index
        ) => {
            context.beginPath();

            context.fillStyle =
                color;

            context.arc(
                x +
                30 +
                index * 28,
                centerY,
                radius,
                0,
                Math.PI * 2
            );

            context.fill();
        }
    );

    const addressX =
        x + 135;

    const addressWidth =
        Math.max(
            120,
            width - 175
        );

    roundedRectPath(
        context,
        addressX,
        y + 18,
        addressWidth,
        36,
        18
    );

    context.fillStyle =
        "#e2e8f0";

    context.fill();
}

function drawCardShadow(
    context,
    x,
    y,
    width,
    height,
    radius,
    strength
) {
    if (
        strength <= 0
    ) {
        return;
    }

    context.save();

    context.shadowColor =
        `rgba(15,23,42,${strength / 160
        })`;

    context.shadowBlur =
        20 +
        strength * 0.35;

    context.shadowOffsetY =
        10 +
        strength * 0.08;

    context.fillStyle =
        "#ffffff";

    roundedRectPath(
        context,
        x,
        y,
        width,
        height,
        radius
    );

    context.fill();

    context.restore();
}

export async function createBeautifiedScreenshot(
    file,
    rawSettings = {}
) {
    if (!file) {
        throw new Error(
            "Choose a screenshot first."
        );
    }

    if (
        !ALLOWED_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Screenshot must be JPG, PNG, or WebP."
        );
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "Screenshot must be 15 MB or smaller."
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
            MAX_SOURCE_PIXELS
        ) {
            throw new Error(
                "This screenshot is too large for safe browser processing."
            );
        }

        const settings =
            normalizeScreenshotSettings(
                rawSettings
            );

        const dimensions =
            getBeautifiedDimensions(
                bitmap.width,
                bitmap.height,
                settings
            );

        if (
            dimensions.width *
            dimensions.height >
            MAX_OUTPUT_PIXELS
        ) {
            throw new Error(
                "The selected padding creates an output that is too large for safe browser processing."
            );
        }

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            dimensions.width;

        canvas.height =
            dimensions.height;

        const context =
            canvas.getContext(
                "2d"
            );

        if (!context) {
            throw new Error(
                "Canvas image processing is not supported in this browser."
            );
        }

        const theme =
            SCREENSHOT_THEMES.find(
                (item) =>
                    item.id ===
                    settings.theme
            ) ||
            SCREENSHOT_THEMES[0];

        context.fillStyle =
            createBackgroundGradient(
                context,
                canvas.width,
                canvas.height,
                theme,
                settings.backgroundAngle
            );

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const x =
            settings.padding;

        const y =
            settings.padding;

        const browserBarHeight =
            dimensions.browserBarHeight;

        const cardHeight =
            bitmap.height +
            browserBarHeight;

        if (
            settings.frame !==
            "NONE"
        ) {
            drawCardShadow(
                context,
                x,
                y,
                bitmap.width,
                cardHeight,
                settings.cornerRadius,
                settings.shadowStrength
            );

            context.save();

            roundedRectPath(
                context,
                x,
                y,
                bitmap.width,
                cardHeight,
                settings.cornerRadius
            );

            context.clip();

            context.fillStyle =
                "#ffffff";

            context.fillRect(
                x,
                y,
                bitmap.width,
                cardHeight
            );

            if (
                settings.frame ===
                "BROWSER"
            ) {
                drawBrowserBar(
                    context,
                    x,
                    y,
                    bitmap.width,
                    browserBarHeight
                );
            }

            context.drawImage(
                bitmap,
                x,
                y +
                browserBarHeight,
                bitmap.width,
                bitmap.height
            );

            context.restore();
        } else {
            context.drawImage(
                bitmap,
                x,
                y,
                bitmap.width,
                bitmap.height
            );
        }

        const blob =
            await canvasToBlob(
                canvas,
                settings.outputFormat
            );

        return {
            blob,

            filename:
                `${getBaseName(
                    file.name
                )}-beautified.${settings.outputFormat}`,

            sourceWidth:
                bitmap.width,

            sourceHeight:
                bitmap.height,

            width:
                canvas.width,

            height:
                canvas.height,

            outputSize:
                blob.size,

            format:
                settings.outputFormat,

            theme:
                settings.theme,

            frame:
                settings.frame,

            padding:
                settings.padding,

            cornerRadius:
                settings.cornerRadius,

            shadowStrength:
                settings.shadowStrength,

            preservedNativeResolution:
                true,
        };
    } finally {
        bitmap.close();
    }
}