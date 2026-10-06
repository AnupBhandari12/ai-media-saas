import { loadPdfLib } from "@/lib/tools/pdf/pdfLib";

const MAX_FILES = 15;
const MAX_FILE_SIZE =
    10 * 1024 * 1024;
const MAX_TOTAL_SIZE =
    50 * 1024 * 1024;
const MAX_IMAGE_PIXELS =
    40_000_000;

const SUPPORTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

const A4 = [
    595.28,
    841.89,
];

function canvasToJpegBlob(
    canvas,
    quality = 0.88
) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "The browser could not prepare a scanned page."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },
                "image/jpeg",
                quality
            );
        }
    );
}

function applyEnhancement(
    imageData,
    mode
) {
    if (mode === "ORIGINAL") {
        return;
    }

    const data =
        imageData.data;

    for (
        let index = 0;
        index < data.length;
        index += 4
    ) {
        const luminance =
            data[index] *
            0.299 +
            data[index + 1] *
            0.587 +
            data[index + 2] *
            0.114;

        if (
            mode === "GRAYSCALE"
        ) {
            const value =
                Math.round(
                    luminance
                );

            data[index] = value;
            data[index + 1] =
                value;
            data[index + 2] =
                value;

            continue;
        }

        if (
            mode === "ENHANCE"
        ) {
            const contrast =
                1.35;

            let value =
                (luminance - 128) *
                contrast +
                128 +
                8;

            value =
                Math.max(
                    0,
                    Math.min(
                        255,
                        Math.round(value)
                    )
                );

            data[index] = value;
            data[index + 1] =
                value;
            data[index + 2] =
                value;
        }
    }
}

async function prepareScanPage(
    file,
    mode
) {
    const bitmap =
        await createImageBitmap(
            file
        );

    try {
        if (
            bitmap.width *
            bitmap.height >
            MAX_IMAGE_PIXELS
        ) {
            throw new Error(
                `"${file.name}" is too large for safe browser processing.`
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
                "2d",
                {
                    willReadFrequently:
                        mode !==
                        "ORIGINAL",
                }
            );

        if (!context) {
            throw new Error(
                "Image processing is not supported in this browser."
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

        context.drawImage(
            bitmap,
            0,
            0
        );

        if (
            mode !==
            "ORIGINAL"
        ) {
            const imageData =
                context.getImageData(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

            applyEnhancement(
                imageData,
                mode
            );

            context.putImageData(
                imageData,
                0,
                0
            );
        }

        const blob =
            await canvasToJpegBlob(
                canvas
            );

        return {
            bytes:
                await blob.arrayBuffer(),

            width:
                bitmap.width,

            height:
                bitmap.height,
        };
    } finally {
        bitmap.close();
    }
}

export async function createScannedPdfFromImages(
    files,
    {
        mode = "ENHANCE",
        pageSize = "A4",
        margin = 24,
    } = {}
) {
    if (
        !Array.isArray(files) ||
        files.length === 0
    ) {
        throw new Error(
            "Choose at least one document photo."
        );
    }

    if (
        files.length >
        MAX_FILES
    ) {
        throw new Error(
            `You can scan up to ${MAX_FILES} photos at once.`
        );
    }

    const totalSize =
        files.reduce(
            (sum, file) =>
                sum + file.size,
            0
        );

    if (
        totalSize >
        MAX_TOTAL_SIZE
    ) {
        throw new Error(
            "Combined photo size must be 50 MB or smaller."
        );
    }

    for (const file of files) {
        if (
            !SUPPORTED_TYPES.includes(
                file.type
            )
        ) {
            throw new Error(
                `"${file.name}" must be JPG, PNG, or WebP.`
            );
        }

        if (
            file.size >
            MAX_FILE_SIZE
        ) {
            throw new Error(
                `"${file.name}" is larger than 10 MB.`
            );
        }
    }

    if (
        ![
            "ORIGINAL",
            "GRAYSCALE",
            "ENHANCE",
        ].includes(mode)
    ) {
        throw new Error(
            "Choose a valid scan enhancement mode."
        );
    }

    const safeMargin =
        Math.min(
            54,
            Math.max(
                0,
                Number(margin)
            )
        );

    const {
        PDFDocument,
    } = await loadPdfLib();

    const pdfDocument =
        await PDFDocument.create();

    for (const file of files) {
        const prepared =
            await prepareScanPage(
                file,
                mode
            );

        const image =
            await pdfDocument.embedJpg(
                prepared.bytes
            );

        let pageWidth;
        let pageHeight;

        if (
            pageSize === "FIT"
        ) {
            const scale =
                Math.min(
                    1,
                    800 /
                    Math.max(
                        prepared.width,
                        prepared.height
                    )
                );

            pageWidth =
                prepared.width *
                scale *
                0.75 +
                safeMargin * 2;

            pageHeight =
                prepared.height *
                scale *
                0.75 +
                safeMargin * 2;
        } else {
            const landscape =
                prepared.width >
                prepared.height;

            pageWidth =
                landscape
                    ? A4[1]
                    : A4[0];

            pageHeight =
                landscape
                    ? A4[0]
                    : A4[1];
        }

        const page =
            pdfDocument.addPage([
                pageWidth,
                pageHeight,
            ]);

        const availableWidth =
            pageWidth -
            safeMargin * 2;

        const availableHeight =
            pageHeight -
            safeMargin * 2;

        const scale =
            Math.min(
                availableWidth /
                prepared.width,

                availableHeight /
                prepared.height
            );

        const drawWidth =
            prepared.width *
            scale;

        const drawHeight =
            prepared.height *
            scale;

        page.drawImage(
            image,
            {
                x:
                    (pageWidth -
                        drawWidth) /
                    2,

                y:
                    (pageHeight -
                        drawHeight) /
                    2,

                width:
                    drawWidth,

                height:
                    drawHeight,
            }
        );
    }

    pdfDocument.setTitle(
        "AI Media Scanned Document"
    );

    pdfDocument.setCreator(
        "AI Media by Bhanova Technologies"
    );

    const bytes =
        await pdfDocument.save({
            useObjectStreams: true,
        });

    const blob =
        new Blob(
            [bytes],
            {
                type:
                    "application/pdf",
            }
        );

    return {
        blob,

        pageCount:
            files.length,

        originalTotalSize:
            totalSize,

        outputSize:
            blob.size,

        mode,

        pageSize,

        margin:
            safeMargin,
    };
}