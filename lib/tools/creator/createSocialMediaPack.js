import { imagePresets } from "@/lib/presets";

import {
    BATCH_ITEM_STATUS,
    createBatchItems,
} from "@/lib/tools/batch/status";

import { createResultZip } from "@/lib/tools/batch/createResultZip";

const MAX_FILE_SIZE =
    15 * 1024 * 1024;

const MAX_PIXELS =
    40_000_000;

const MAX_OUTPUTS = 8;

const SUPPORTED_TYPES = [
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
    mimeType,
    quality
) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "The browser could not create this output."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },
                mimeType,
                quality
            );
        }
    );
}

function drawCover(
    context,
    bitmap,
    width,
    height,
    focusX,
    focusY
) {
    const scale =
        Math.max(
            width /
            bitmap.width,

            height /
            bitmap.height
        );

    const drawWidth =
        bitmap.width *
        scale;

    const drawHeight =
        bitmap.height *
        scale;

    const overflowX =
        Math.max(
            0,
            drawWidth - width
        );

    const overflowY =
        Math.max(
            0,
            drawHeight - height
        );

    const x =
        -overflowX *
        (focusX / 100);

    const y =
        -overflowY *
        (focusY / 100);

    context.drawImage(
        bitmap,
        x,
        y,
        drawWidth,
        drawHeight
    );
}

async function createPresetOutput(
    bitmap,
    sourceFile,
    preset,
    {
        focusX,
        focusY,
        quality,
    }
) {
    const canvas =
        document.createElement(
            "canvas"
        );

    canvas.width =
        preset.width;

    canvas.height =
        preset.height;

    const context =
        canvas.getContext("2d");

    if (!context) {
        throw new Error(
            "Canvas image processing is not supported."
        );
    }

    context.fillStyle =
        "#ffffff";

    context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    context.imageSmoothingEnabled =
        true;

    context.imageSmoothingQuality =
        "high";

    drawCover(
        context,
        bitmap,
        preset.width,
        preset.height,
        focusX,
        focusY
    );

    const blob =
        await canvasToBlob(
            canvas,
            "image/jpeg",
            quality
        );

    canvas.width = 1;
    canvas.height = 1;

    return {
        presetId:
            preset.id,

        name:
            preset.name,

        platform:
            preset.platform,

        width:
            preset.width,

        height:
            preset.height,

        mimeType:
            "image/jpeg",

        filename:
            `${getBaseName(
                sourceFile.name
            )}-${preset.id}.jpg`,

        blob,

        outputSize:
            blob.size,
    };
}

export async function createSocialMediaPack(
    file,
    {
        presetIds,
        focusX = 50,
        focusY = 50,
        qualityPercent = 90,
        onItemUpdate,
    } = {}
) {
    if (!file) {
        throw new Error(
            "Choose an image first."
        );
    }

    if (
        !SUPPORTED_TYPES.includes(
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

    if (
        !Array.isArray(
            presetIds
        ) ||
        presetIds.length === 0
    ) {
        throw new Error(
            "Select at least one output."
        );
    }

    if (
        presetIds.length >
        MAX_OUTPUTS
    ) {
        throw new Error(
            `Choose up to ${MAX_OUTPUTS} outputs per pack.`
        );
    }

    const selectedPresets =
        presetIds.map(
            (presetId) => {
                const preset =
                    imagePresets.find(
                        (item) =>
                            item.id ===
                            presetId
                    );

                if (!preset) {
                    throw new Error(
                        `Unknown preset: ${presetId}`
                    );
                }

                return preset;
            }
        );

    const safeFocusX =
        Math.min(
            100,
            Math.max(
                0,
                Number(focusX)
            )
        );

    const safeFocusY =
        Math.min(
            100,
            Math.max(
                0,
                Number(focusY)
            )
        );

    const quality =
        Math.min(
            0.95,
            Math.max(
                0.6,
                Number(
                    qualityPercent
                ) / 100
            )
        );

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
                "This source image is too large for safe browser processing."
            );
        }

        const items =
            createBatchItems(
                selectedPresets.map(
                    (preset) => ({
                        presetId:
                            preset.id,

                        name:
                            preset.name,

                        platform:
                            preset.platform,

                        width:
                            preset.width,

                        height:
                            preset.height,
                    })
                )
            );

        const results = [];

        for (
            let index = 0;
            index <
            selectedPresets.length;
            index += 1
        ) {
            const preset =
                selectedPresets[
                index
                ];

            onItemUpdate?.({
                ...items[index],
                status:
                    BATCH_ITEM_STATUS.PROCESSING,
            });

            try {
                const output =
                    await createPresetOutput(
                        bitmap,
                        file,
                        preset,
                        {
                            focusX:
                                safeFocusX,

                            focusY:
                                safeFocusY,

                            quality,
                        }
                    );

                const result = {
                    ...output,

                    status:
                        BATCH_ITEM_STATUS.SUCCESS,

                    error: "",
                };

                results.push(
                    result
                );

                onItemUpdate?.(
                    result
                );
            } catch (error) {
                const result = {
                    ...items[index],

                    status:
                        BATCH_ITEM_STATUS.ERROR,

                    error:
                        error instanceof
                            Error
                            ? error.message
                            : "Output failed.",
                };

                results.push(
                    result
                );

                onItemUpdate?.(
                    result
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
                "All selected outputs failed."
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

            sourceName:
                file.name,

            sourceSize:
                file.size,

            sourceWidth:
                bitmap.width,

            sourceHeight:
                bitmap.height,

            focusX:
                safeFocusX,

            focusY:
                safeFocusY,

            qualityPercent:
                Math.round(
                    quality * 100
                ),
        };
    } finally {
        bitmap.close();
    }
}