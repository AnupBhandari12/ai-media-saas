const SUPPORTED_OUTPUT_TYPES = [
    "image/jpeg",
    "image/png",
];

function hasHeicExtension(file) {
    const name = file?.name?.toLowerCase() || "";

    return (
        name.endsWith(".heic") ||
        name.endsWith(".heif")
    );
}

export async function convertHeicImage(
    file,
    {
        outputMimeType = "image/jpeg",
        qualityPercent = 90,
    } = {}
) {
    if (!file) {
        throw new Error(
            "No HEIC or HEIF file was provided."
        );
    }

    if (
        !SUPPORTED_OUTPUT_TYPES.includes(
            outputMimeType
        )
    ) {
        throw new Error(
            "Output must be JPG or PNG."
        );
    }

    if (!hasHeicExtension(file)) {
        throw new Error(
            "Please choose a real HEIC or HEIF image."
        );
    }

    const quality = Math.min(
        0.95,
        Math.max(
            0.4,
            Number(qualityPercent) / 100
        )
    );

    try {
        const {
            heicTo,
            isHeic,
        } = await import(
            "heic-to/csp"
        );

        const validHeic =
            await isHeic(file);

        if (!validHeic) {
            throw new Error(
                "The selected file does not contain a valid HEIC / HEIF image."
            );
        }

        const convertedBlob =
            await heicTo({
                blob: file,
                type: outputMimeType,

                ...(outputMimeType ===
                    "image/jpeg"
                    ? {
                        quality,
                    }
                    : {}),
            });

        if (
            !(convertedBlob instanceof Blob)
        ) {
            throw new Error(
                "The HEIC converter returned an invalid result."
            );
        }

        const bitmap =
            await createImageBitmap(
                convertedBlob
            );

        try {
            return {
                blob: convertedBlob,

                originalSize:
                    file.size,

                outputSize:
                    convertedBlob.size,

                width:
                    bitmap.width,

                height:
                    bitmap.height,

                inputMimeType:
                    file.type ||
                    "image/heic",

                outputMimeType:
                    convertedBlob.type ||
                    outputMimeType,

                quality:
                    outputMimeType ===
                        "image/jpeg"
                        ? Math.round(
                            quality * 100
                        )
                        : null,
            };
        } finally {
            bitmap.close();
        }
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }

        throw new Error(
            "This HEIC / HEIF image could not be converted."
        );
    }
}