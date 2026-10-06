const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

function canvasToBlob(
    canvas,
    mimeType
) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            "The browser could not create the cleaned image."
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
                : 0.95
        );
    });
}

export async function removeImageMetadata(
    file
) {
    if (!file) {
        throw new Error(
            "No image file was provided."
        );
    }

    if (
        !SUPPORTED_TYPES.includes(
            file.type
        )
    ) {
        throw new Error(
            "Please use a JPG, PNG, or WebP image."
        );
    }

    const bitmap =
        await createImageBitmap(file);

    try {
        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            bitmap.width;

        canvas.height =
            bitmap.height;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Image processing is not supported in this browser."
            );
        }

        context.imageSmoothingEnabled =
            true;

        context.imageSmoothingQuality =
            "high";

        context.drawImage(
            bitmap,
            0,
            0
        );

        const blob =
            await canvasToBlob(
                canvas,
                file.type
            );

        return {
            blob,

            originalSize:
                file.size,

            outputSize:
                blob.size,

            width:
                bitmap.width,

            height:
                bitmap.height,

            mimeType:
                blob.type,
        };
    } finally {
        bitmap.close();
    }
}