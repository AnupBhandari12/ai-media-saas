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
                            "The browser could not create the processed image."
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

export async function blurRedactImage(
    file,
    {
        x,
        y,
        width,
        height,
        mode = "blur",
        blurAmount = 18,
        redactColor = "#000000",
    }
) {
    if (!file) {
        throw new Error("No image file was provided.");
    }

    if (!SUPPORTED_TYPES.includes(file.type)) {
        throw new Error(
            "Please use a JPG, PNG, or WebP image."
        );
    }

    if (!["blur", "redact"].includes(mode)) {
        throw new Error("Invalid processing mode.");
    }

    const regionX = Math.round(Number(x));
    const regionY = Math.round(Number(y));
    const regionWidth = Math.round(Number(width));
    const regionHeight = Math.round(Number(height));

    if (
        !Number.isFinite(regionX) ||
        !Number.isFinite(regionY) ||
        !Number.isFinite(regionWidth) ||
        !Number.isFinite(regionHeight) ||
        regionX < 0 ||
        regionY < 0 ||
        regionWidth < 1 ||
        regionHeight < 1
    ) {
        throw new Error(
            "Please enter a valid region."
        );
    }

    const bitmap = await createImageBitmap(file);

    try {
        if (
            regionX + regionWidth > bitmap.width ||
            regionY + regionHeight > bitmap.height
        ) {
            throw new Error(
                "The selected region must stay inside the original image."
            );
        }

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

        context.drawImage(bitmap, 0, 0);

        if (mode === "redact") {
            context.fillStyle = redactColor;

            context.fillRect(
                regionX,
                regionY,
                regionWidth,
                regionHeight
            );
        } else {
            const tempCanvas =
                document.createElement("canvas");

            tempCanvas.width = regionWidth;
            tempCanvas.height = regionHeight;

            const tempContext =
                tempCanvas.getContext("2d");

            if (!tempContext) {
                throw new Error(
                    "Blur processing is not supported in this browser."
                );
            }

            tempContext.drawImage(
                bitmap,
                regionX,
                regionY,
                regionWidth,
                regionHeight,
                0,
                0,
                regionWidth,
                regionHeight
            );

            context.save();

            context.beginPath();

            context.rect(
                regionX,
                regionY,
                regionWidth,
                regionHeight
            );

            context.clip();

            context.filter = `blur(${Math.min(
                40,
                Math.max(2, Number(blurAmount))
            )}px)`;

            const padding = Math.max(
                20,
                Number(blurAmount) * 2
            );

            context.drawImage(
                tempCanvas,
                regionX - padding,
                regionY - padding,
                regionWidth + padding * 2,
                regionHeight + padding * 2
            );

            context.restore();
            context.filter = "none";
        }

        const blob = await canvasToBlob(
            canvas,
            file.type
        );

        return {
            blob,

            originalSize: file.size,
            outputSize: blob.size,

            originalWidth: bitmap.width,
            originalHeight: bitmap.height,

            width: bitmap.width,
            height: bitmap.height,

            region: {
                x: regionX,
                y: regionY,
                width: regionWidth,
                height: regionHeight,
            },

            mode,

            blurAmount:
                mode === "blur"
                    ? Number(blurAmount)
                    : null,

            redactColor:
                mode === "redact"
                    ? redactColor
                    : null,

            mimeType: blob.type,
        };
    } finally {
        bitmap.close();
    }
}