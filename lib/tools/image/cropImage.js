const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

function canvasToBlob(canvas, mimeType) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(
                        new Error(
                            "The browser could not create the cropped image."
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

export async function cropImage(
    file,
    {
        x,
        y,
        width,
        height,
    }
) {
    if (!file) {
        throw new Error(
            "No image file was provided."
        );
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
        throw new Error(
            "Unsupported image format."
        );
    }

    const cropX = Math.round(Number(x));
    const cropY = Math.round(Number(y));
    const cropWidth = Math.round(Number(width));
    const cropHeight = Math.round(Number(height));

    if (
        !Number.isFinite(cropX) ||
        !Number.isFinite(cropY) ||
        !Number.isFinite(cropWidth) ||
        !Number.isFinite(cropHeight) ||
        cropX < 0 ||
        cropY < 0 ||
        cropWidth < 1 ||
        cropHeight < 1
    ) {
        throw new Error(
            "Please enter a valid crop area."
        );
    }

    const bitmap =
        await createImageBitmap(file);

    try {
        if (
            cropX + cropWidth > bitmap.width ||
            cropY + cropHeight > bitmap.height
        ) {
            throw new Error(
                "The crop area must stay inside the original image."
            );
        }

        const canvas =
            document.createElement("canvas");

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "Image processing is not supported in this browser."
            );
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";

        context.drawImage(
            bitmap,

            cropX,
            cropY,
            cropWidth,
            cropHeight,

            0,
            0,
            cropWidth,
            cropHeight
        );

        const blob = await canvasToBlob(
            canvas,
            file.type
        );

        return {
            blob,

            originalSize: file.size,
            croppedSize: blob.size,

            originalWidth: bitmap.width,
            originalHeight: bitmap.height,

            x: cropX,
            y: cropY,

            width: cropWidth,
            height: cropHeight,

            mimeType: blob.type,
        };
    } finally {
        bitmap.close();
    }
}