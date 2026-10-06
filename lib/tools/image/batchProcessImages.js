import JSZip from "jszip";

const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const OUTPUT_TYPES = {
    ORIGINAL: "original",
    JPEG: "image/jpeg",
    PNG: "image/png",
    WEBP: "image/webp",
};

function canvasToBlob(
    canvas,
    mimeType,
    quality
) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            "The browser could not create one of the processed images."
                        )
                    );
                    return;
                }

                resolve(blob);
            },
            mimeType,
            mimeType === "image/png"
                ? undefined
                : quality
        );
    });
}

function getBaseName(name) {
    const dot =
        name.lastIndexOf(".");

    return dot > 0
        ? name.slice(0, dot)
        : name;
}

function getExtension(
    mimeType
) {
    const map = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    };

    return map[mimeType] || "jpg";
}

async function processOneImage(
    file,
    {
        scalePercent,
        outputType,
        qualityPercent,
    }
) {
    if (
        !SUPPORTED_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            `${file.name}: unsupported format.`
        );
    }

    const bitmap =
        await createImageBitmap(file);

    try {
        const scale =
            Math.min(
                2,
                Math.max(
                    0.1,
                    Number(scalePercent) /
                    100
                )
            );

        const width = Math.max(
            1,
            Math.round(
                bitmap.width * scale
            )
        );

        const height = Math.max(
            1,
            Math.round(
                bitmap.height * scale
            )
        );

        const mimeType =
            outputType ===
                OUTPUT_TYPES.ORIGINAL
                ? file.type
                : outputType;

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width = width;
        canvas.height = height;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                `${file.name}: image processing is not supported.`
            );
        }

        if (
            mimeType ===
            "image/jpeg"
        ) {
            context.fillStyle =
                "#ffffff";

            context.fillRect(
                0,
                0,
                width,
                height
            );
        }

        context.imageSmoothingEnabled =
            true;

        context.imageSmoothingQuality =
            "high";

        context.drawImage(
            bitmap,
            0,
            0,
            width,
            height
        );

        const quality =
            Math.min(
                0.95,
                Math.max(
                    0.4,
                    Number(
                        qualityPercent
                    ) / 100
                )
            );

        const blob =
            await canvasToBlob(
                canvas,
                mimeType,
                quality
            );

        const filename =
            `${getBaseName(
                file.name
            )}-processed.${getExtension(
                blob.type
            )}`;

        return {
            sourceName:
                file.name,

            filename,

            blob,

            originalSize:
                file.size,

            outputSize:
                blob.size,

            originalWidth:
                bitmap.width,

            originalHeight:
                bitmap.height,

            width,
            height,

            mimeType:
                blob.type,
        };
    } finally {
        bitmap.close();
    }
}

async function runWithConcurrency(
    files,
    options,
    concurrency = 2
) {
    const results =
        new Array(files.length);

    let nextIndex = 0;

    async function worker() {
        while (true) {
            const index =
                nextIndex;

            nextIndex += 1;

            if (
                index >=
                files.length
            ) {
                return;
            }

            results[index] =
                await processOneImage(
                    files[index],
                    options
                );
        }
    }

    const workerCount =
        Math.min(
            concurrency,
            files.length
        );

    await Promise.all(
        Array.from(
            {
                length:
                    workerCount,
            },
            () => worker()
        )
    );

    return results;
}

export async function batchProcessImages(
    files,
    {
        scalePercent = 100,
        outputType =
        OUTPUT_TYPES.ORIGINAL,
        qualityPercent = 85,
    } = {}
) {
    if (
        !Array.isArray(files) ||
        files.length === 0
    ) {
        throw new Error(
            "Choose at least one image."
        );
    }

    if (files.length > 10) {
        throw new Error(
            "You can process up to 10 images at once."
        );
    }

    const results =
        await runWithConcurrency(
            files,
            {
                scalePercent,
                outputType,
                qualityPercent,
            },
            2
        );

    const zip =
        new JSZip();

    for (const result of results) {
        zip.file(
            result.filename,
            result.blob
        );
    }

    const zipBlob =
        await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",

            compressionOptions: {
                level: 6,
            },
        });

    return {
        results,

        zipBlob,

        scalePercent:
            Number(scalePercent),

        outputType,

        qualityPercent:
            Number(qualityPercent),
    };
}

export {
    OUTPUT_TYPES,
};