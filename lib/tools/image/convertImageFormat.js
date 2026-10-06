const SUPPORTED_INPUT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
];

const SUPPORTED_OUTPUT_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
];

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
                            "The browser could not create the converted image."
                        )
                    );
                    return;
                }

                resolve(blob);
            },
            mimeType,
            quality
        );
    });
}

export async function convertImageFormat(
    file,
    outputMimeType,
    qualityPercent = 90
) {
    if (!file) {
        throw new Error(
            "No image file was provided."
        );
    }

    if (
        !SUPPORTED_INPUT_TYPES.includes(file.type)
    ) {
        throw new Error(
            "Unsupported input image format."
        );
    }

    if (
        !SUPPORTED_OUTPUT_TYPES.includes(
            outputMimeType
        )
    ) {
        throw new Error(
            "Unsupported output image format."
        );
    }

    const quality = Math.min(
        0.95,
        Math.max(
            0.4,
            Number(qualityPercent) / 100
        )
    );

    let bitmap;

    try {
        bitmap =
            await createImageBitmap(file);
    } catch {
        throw new Error(
            "This browser could not decode the selected image format."
        );
    }

    try {
        const canvas =
            document.createElement("canvas");

        canvas.width = bitmap.width;
        canvas.height = bitmap.height;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Image processing is not supported in this browser."
            );
        }

        if (outputMimeType === "image/jpeg") {
            context.fillStyle = "#ffffff";

            context.fillRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
        }

        context.drawImage(bitmap, 0, 0);

        const blob = await canvasToBlob(
            canvas,
            outputMimeType,
            outputMimeType === "image/png"
                ? undefined
                : quality
        );

        if (blob.type !== outputMimeType) {
            throw new Error(
                outputMimeType === "image/avif"
                    ? "AVIF encoding is not supported by this browser. Please choose JPG, PNG, or WebP."
                    : "The requested output format is not supported by this browser."
            );
        }

        return {
            blob,

            originalSize: file.size,
            convertedSize: blob.size,

            width: bitmap.width,
            height: bitmap.height,

            inputMimeType: file.type,
            outputMimeType: blob.type,

            quality:
                outputMimeType === "image/png"
                    ? null
                    : Math.round(quality * 100),
        };
    } finally {
        bitmap.close();
    }
}