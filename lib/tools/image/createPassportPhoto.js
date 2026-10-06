const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const SUPPORTED_OUTPUT_TYPES = [
    "image/jpeg",
    "image/png",
];

function canvasToBlob(
    canvas,
    mimeType,
    quality = 0.92
) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            "The browser could not create the ID photo."
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

export async function createPassportPhoto(
    file,
    {
        width,
        height,
        zoom = 1,
        verticalPosition = 50,
        outputMimeType = "image/jpeg",
    }
) {
    if (!file) {
        throw new Error(
            "No image file was provided."
        );
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
        throw new Error(
            "Please use a JPG, PNG, or WebP image."
        );
    }

    if (
        !SUPPORTED_OUTPUT_TYPES.includes(
            outputMimeType
        )
    ) {
        throw new Error(
            "Unsupported output format."
        );
    }

    const outputWidth = Math.round(
        Number(width)
    );

    const outputHeight = Math.round(
        Number(height)
    );

    const safeZoom = Math.min(
        2,
        Math.max(1, Number(zoom))
    );

    const safeVerticalPosition = Math.min(
        100,
        Math.max(
            0,
            Number(verticalPosition)
        )
    );

    if (
        !Number.isFinite(outputWidth) ||
        !Number.isFinite(outputHeight) ||
        outputWidth < 1 ||
        outputHeight < 1
    ) {
        throw new Error(
            "Invalid output dimensions."
        );
    }

    const bitmap =
        await createImageBitmap(file);

    try {
        const canvas =
            document.createElement("canvas");

        canvas.width = outputWidth;
        canvas.height = outputHeight;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Image processing is not supported in this browser."
            );
        }

        context.fillStyle = "#ffffff";

        context.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        const baseScale = Math.max(
            outputWidth / bitmap.width,
            outputHeight / bitmap.height
        );

        const scale =
            baseScale * safeZoom;

        const drawWidth =
            bitmap.width * scale;

        const drawHeight =
            bitmap.height * scale;

        const drawX =
            (outputWidth - drawWidth) / 2;

        const remainingY =
            outputHeight - drawHeight;

        const drawY =
            remainingY *
            (safeVerticalPosition / 100);

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        context.drawImage(
            bitmap,
            drawX,
            drawY,
            drawWidth,
            drawHeight
        );

        const blob = await canvasToBlob(
            canvas,
            outputMimeType
        );

        return {
            blob,

            originalSize: file.size,
            outputSize: blob.size,

            originalWidth: bitmap.width,
            originalHeight: bitmap.height,

            width: outputWidth,
            height: outputHeight,

            zoom: safeZoom,
            verticalPosition:
                safeVerticalPosition,

            mimeType: blob.type,
        };
    } finally {
        bitmap.close();
    }
}