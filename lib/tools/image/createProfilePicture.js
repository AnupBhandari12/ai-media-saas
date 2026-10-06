const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const SUPPORTED_OUTPUT_TYPES = [
    "image/jpeg",
    "image/png",
];

function canvasToBlob(canvas, mimeType) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            "The browser could not create the profile picture."
                        )
                    );
                    return;
                }

                resolve(blob);
            },
            mimeType,
            0.92
        );
    });
}

export async function createProfilePicture(
    file,
    {
        size = 512,
        zoom = 1,
        horizontalPosition = 50,
        verticalPosition = 50,
        outputMimeType = "image/jpeg",
    } = {}
) {
    if (!file) {
        throw new Error("No image file was provided.");
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

    const outputSize = Math.round(Number(size));

    if (
        !Number.isFinite(outputSize) ||
        outputSize < 128 ||
        outputSize > 2048
    ) {
        throw new Error(
            "Profile picture size must be between 128px and 2048px."
        );
    }

    const safeZoom = Math.min(
        2.5,
        Math.max(1, Number(zoom))
    );

    const safeHorizontal = Math.min(
        100,
        Math.max(
            0,
            Number(horizontalPosition)
        )
    );

    const safeVertical = Math.min(
        100,
        Math.max(
            0,
            Number(verticalPosition)
        )
    );

    const bitmap =
        await createImageBitmap(file);

    try {
        const canvas =
            document.createElement("canvas");

        canvas.width = outputSize;
        canvas.height = outputSize;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Image processing is not supported in this browser."
            );
        }

        if (
            outputMimeType ===
            "image/jpeg"
        ) {
            context.fillStyle = "#ffffff";

            context.fillRect(
                0,
                0,
                outputSize,
                outputSize
            );
        }

        const baseScale = Math.max(
            outputSize / bitmap.width,
            outputSize / bitmap.height
        );

        const scale =
            baseScale * safeZoom;

        const drawWidth =
            bitmap.width * scale;

        const drawHeight =
            bitmap.height * scale;

        const overflowX = Math.max(
            0,
            drawWidth - outputSize
        );

        const overflowY = Math.max(
            0,
            drawHeight - outputSize
        );

        const drawX =
            -overflowX *
            (safeHorizontal / 100);

        const drawY =
            -overflowY *
            (safeVertical / 100);

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

            width: outputSize,
            height: outputSize,

            zoom: safeZoom,

            horizontalPosition:
                safeHorizontal,

            verticalPosition:
                safeVertical,

            mimeType: blob.type,
        };
    } finally {
        bitmap.close();
    }
}