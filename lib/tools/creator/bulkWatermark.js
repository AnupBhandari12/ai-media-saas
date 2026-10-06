import { createResultZip } from "@/lib/tools/batch/createResultZip";

import { BATCH_ITEM_STATUS } from "@/lib/tools/batch/status";

const MAX_FILES = 12;

const MAX_FILE_SIZE =
    10 * 1024 * 1024;

const MAX_TOTAL_SIZE =
    60 * 1024 * 1024;

const MAX_PIXELS =
    40_000_000;

const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const MIME_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export const BULK_WATERMARK_POSITIONS = [
    {
        value: "top-left",
        label: "Top Left",
    },
    {
        value: "top-center",
        label: "Top Center",
    },
    {
        value: "top-right",
        label: "Top Right",
    },
    {
        value: "center",
        label: "Center",
    },
    {
        value: "bottom-left",
        label: "Bottom Left",
    },
    {
        value: "bottom-center",
        label: "Bottom Center",
    },
    {
        value: "bottom-right",
        label: "Bottom Right",
    },
];

function clamp(
    value,
    min,
    max
) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.min(
        max,
        Math.max(min, number)
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

export function brandPositionToBulk(
    position
) {
    const normalized =
        String(position || "")
            .trim()
            .toLowerCase()
            .replaceAll("_", "-");

    const exists =
        BULK_WATERMARK_POSITIONS.some(
            (item) =>
                item.value ===
                normalized
        );

    return exists
        ? normalized
        : "bottom-right";
}

export function normalizeBulkWatermarkSettings(
    settings = {}
) {
    const type =
        settings.type === "logo"
            ? "logo"
            : "text";

    const position =
        BULK_WATERMARK_POSITIONS.some(
            (item) =>
                item.value ===
                settings.position
        )
            ? settings.position
            : "bottom-right";

    return {
        type,

        text:
            String(
                settings.text || ""
            )
                .trim()
                .slice(0, 100),

        position,

        opacity:
            clamp(
                settings.opacity,
                5,
                100
            ),

        sizePercent:
            clamp(
                settings.sizePercent,
                5,
                70
            ),

        color:
            validColor(
                settings.color,
                "#ffffff"
            ),
    };
}

function getBaseName(name) {
    const dot =
        name.lastIndexOf(".");

    return dot > 0
        ? name.slice(0, dot)
        : name;
}

export function createBulkWatermarkFilename(
    file
) {
    const extension =
        MIME_EXTENSIONS[
        file.type
        ] || "jpg";

    return `${getBaseName(
        file.name
    )}-watermarked.${extension}`;
}

function canvasToBlob(
    canvas,
    mimeType
) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "The browser could not create the watermarked image."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },

                mimeType,

                mimeType ===
                    "image/png"
                    ? undefined
                    : 0.92
            );
        }
    );
}

function getPosition({
    position,
    canvasWidth,
    canvasHeight,
    itemWidth,
    itemHeight,
    margin,
}) {
    const left =
        margin;

    const centerX =
        (canvasWidth -
            itemWidth) /
        2;

    const right =
        canvasWidth -
        itemWidth -
        margin;

    const top =
        margin;

    const centerY =
        (canvasHeight -
            itemHeight) /
        2;

    const bottom =
        canvasHeight -
        itemHeight -
        margin;

    const map = {
        "top-left": [
            left,
            top,
        ],

        "top-center": [
            centerX,
            top,
        ],

        "top-right": [
            right,
            top,
        ],

        center: [
            centerX,
            centerY,
        ],

        "bottom-left": [
            left,
            bottom,
        ],

        "bottom-center": [
            centerX,
            bottom,
        ],

        "bottom-right": [
            right,
            bottom,
        ],
    };

    return (
        map[position] ||
        map["bottom-right"]
    );
}

async function loadRemoteLogo(
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

async function loadLogoBitmap({
    watermarkFile,
    watermarkUrl,
}) {
    if (watermarkFile) {
        return createImageBitmap(
            watermarkFile
        );
    }

    if (watermarkUrl) {
        return loadRemoteLogo(
            watermarkUrl
        );
    }

    return null;
}

function drawTextWatermark(
    context,
    canvas,
    settings
) {
    const minimumSide =
        Math.min(
            canvas.width,
            canvas.height
        );

    let fontSize =
        Math.max(
            16,
            Math.round(
                minimumSide *
                (
                    settings.sizePercent /
                    100
                ) *
                0.55
            )
        );

    context.font =
        `700 ${fontSize}px Arial, Helvetica, sans-serif`;

    let metrics =
        context.measureText(
            settings.text
        );

    const maxTextWidth =
        canvas.width * 0.82;

    if (
        metrics.width >
        maxTextWidth
    ) {
        const scale =
            maxTextWidth /
            metrics.width;

        fontSize =
            Math.max(
                14,
                Math.floor(
                    fontSize * scale
                )
            );

        context.font =
            `700 ${fontSize}px Arial, Helvetica, sans-serif`;

        metrics =
            context.measureText(
                settings.text
            );
    }

    const textWidth =
        metrics.width;

    const textHeight =
        fontSize * 1.15;

    const margin =
        Math.max(
            12,
            Math.round(
                minimumSide *
                0.03
            )
        );

    const [x, y] =
        getPosition({
            position:
                settings.position,

            canvasWidth:
                canvas.width,

            canvasHeight:
                canvas.height,

            itemWidth:
                textWidth,

            itemHeight:
                textHeight,

            margin,
        });

    context.fillStyle =
        settings.color;

    context.textBaseline =
        "top";

    context.shadowColor =
        "rgba(0,0,0,0.45)";

    context.shadowBlur =
        Math.max(
            2,
            Math.round(
                fontSize * 0.08
            )
        );

    context.fillText(
        settings.text,
        x,
        y
    );
}

function drawLogoWatermark(
    context,
    canvas,
    logoBitmap,
    settings
) {
    const minimumSide =
        Math.min(
            canvas.width,
            canvas.height
        );

    const maxWidth =
        canvas.width *
        (
            settings.sizePercent /
            100
        );

    const maxHeight =
        canvas.height *
        (
            settings.sizePercent /
            100
        );

    const scale =
        Math.min(
            maxWidth /
            logoBitmap.width,

            maxHeight /
            logoBitmap.height
        );

    const width =
        logoBitmap.width *
        scale;

    const height =
        logoBitmap.height *
        scale;

    const margin =
        Math.max(
            12,
            Math.round(
                minimumSide *
                0.03
            )
        );

    const [x, y] =
        getPosition({
            position:
                settings.position,

            canvasWidth:
                canvas.width,

            canvasHeight:
                canvas.height,

            itemWidth:
                width,

            itemHeight:
                height,

            margin,
        });

    context.drawImage(
        logoBitmap,
        x,
        y,
        width,
        height
    );
}

async function processOneImage(
    item,
    settings,
    logoBitmap
) {
    const bitmap =
        await createImageBitmap(
            item.file
        );

    try {
        if (
            bitmap.width *
            bitmap.height >
            MAX_PIXELS
        ) {
            throw new Error(
                "Image dimensions are too large for safe browser processing."
            );
        }

        const canvas =
            document.createElement(
                "canvas"
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
                "Canvas image processing is not supported."
            );
        }

        if (
            item.file.type ===
            "image/jpeg"
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
            0
        );

        context.save();

        context.globalAlpha =
            settings.opacity /
            100;

        if (
            settings.type ===
            "logo"
        ) {
            if (!logoBitmap) {
                throw new Error(
                    "No watermark logo is available."
                );
            }

            drawLogoWatermark(
                context,
                canvas,
                logoBitmap,
                settings
            );
        } else {
            drawTextWatermark(
                context,
                canvas,
                settings
            );
        }

        context.restore();

        const blob =
            await canvasToBlob(
                canvas,
                item.file.type
            );

        canvas.width = 1;
        canvas.height = 1;

        return {
            id:
                item.id,

            originalName:
                item.file.name,

            filename:
                createBulkWatermarkFilename(
                    item.file
                ),

            blob,

            width:
                bitmap.width,

            height:
                bitmap.height,

            originalSize:
                item.file.size,

            outputSize:
                blob.size,

            mimeType:
                blob.type,

            status:
                BATCH_ITEM_STATUS.SUCCESS,

            error: "",
        };
    } finally {
        bitmap.close();
    }
}

export async function bulkWatermarkImages(
    items,
    {
        settings,
        watermarkFile = null,
        watermarkUrl = "",
        onItemUpdate,
    } = {}
) {
    if (
        !Array.isArray(items) ||
        items.length < 2
    ) {
        throw new Error(
            "Choose at least 2 images for Bulk Watermark."
        );
    }

    if (
        items.length >
        MAX_FILES
    ) {
        throw new Error(
            `Choose up to ${MAX_FILES} images at once.`
        );
    }

    const totalSize =
        items.reduce(
            (sum, item) =>
                sum +
                item.file.size,
            0
        );

    if (
        totalSize >
        MAX_TOTAL_SIZE
    ) {
        throw new Error(
            "Combined image size must be 60 MB or smaller."
        );
    }

    for (const item of items) {
        if (
            !SUPPORTED_TYPES.includes(
                item.file.type
            )
        ) {
            throw new Error(
                `"${item.file.name}" must be JPG, PNG, or WebP.`
            );
        }

        if (
            item.file.size >
            MAX_FILE_SIZE
        ) {
            throw new Error(
                `"${item.file.name}" must be 10 MB or smaller.`
            );
        }
    }

    const normalized =
        normalizeBulkWatermarkSettings(
            settings
        );

    if (
        normalized.type ===
        "text" &&
        !normalized.text
    ) {
        throw new Error(
            "Enter watermark text."
        );
    }

    let logoBitmap = null;

    try {
        if (
            normalized.type ===
            "logo"
        ) {
            logoBitmap =
                await loadLogoBitmap({
                    watermarkFile,
                    watermarkUrl,
                });

            if (!logoBitmap) {
                throw new Error(
                    "Choose a watermark logo or use your saved Brand Kit logo."
                );
            }
        }

        const results = [];

        for (const item of items) {
            onItemUpdate?.({
                id:
                    item.id,

                originalName:
                    item.file.name,

                status:
                    BATCH_ITEM_STATUS.PROCESSING,

                error: "",
            });

            try {
                const result =
                    await processOneImage(
                        item,
                        normalized,
                        logoBitmap
                    );

                results.push(
                    result
                );

                onItemUpdate?.(
                    result
                );
            } catch (error) {
                const failed = {
                    id:
                        item.id,

                    originalName:
                        item.file.name,

                    status:
                        BATCH_ITEM_STATUS.ERROR,

                    error:
                        error instanceof
                            Error
                            ? error.message
                            : "Image processing failed.",
                };

                results.push(
                    failed
                );

                onItemUpdate?.(
                    failed
                );
            }
        }

        const successfulResults =
            results.filter(
                (result) =>
                    result.status ===
                    BATCH_ITEM_STATUS.SUCCESS
            );

        const failedResults =
            results.filter(
                (result) =>
                    result.status ===
                    BATCH_ITEM_STATUS.ERROR
            );

        if (
            successfulResults.length ===
            0
        ) {
            throw new Error(
                "All selected images failed to process."
            );
        }

        const {
            zipBlob,
        } =
            await createResultZip(
                successfulResults
            );

        return {
            results,

            successfulResults,

            failedResults,

            zipBlob,

            totalSelected:
                items.length,

            successfulCount:
                successfulResults.length,

            failedCount:
                failedResults.length,

            settings:
                normalized,
        };
    } finally {
        logoBitmap?.close();
    }
}