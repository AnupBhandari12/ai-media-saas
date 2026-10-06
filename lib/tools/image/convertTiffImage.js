import JSZip from "jszip";

const MAX_PAGES = 10;
const MAX_PAGE_PIXELS =
    25_000_000;

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
                            "The browser could not create the converted TIFF page."
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

export async function convertTiffImage(
    file,
    {
        outputMimeType = "image/png",
        qualityPercent = 90,
    } = {}
) {
    if (!file) {
        throw new Error(
            "No TIFF file was provided."
        );
    }

    if (
        ![
            "image/jpeg",
            "image/png",
        ].includes(
            outputMimeType
        )
    ) {
        throw new Error(
            "TIFF output must be JPG or PNG."
        );
    }

    const name =
        file.name.toLowerCase();

    if (
        !name.endsWith(".tif") &&
        !name.endsWith(".tiff")
    ) {
        throw new Error(
            "Please choose a .tif or .tiff file."
        );
    }

    const quality = Math.min(
        0.95,
        Math.max(
            0.4,
            Number(qualityPercent) / 100
        )
    );

    const buffer =
        await file.arrayBuffer();

    const importedModule =
        await import("utif2");

    const UTIF =
        importedModule.default ||
        importedModule;

    const ifds =
        UTIF.decode(buffer);

    if (
        !Array.isArray(ifds) ||
        ifds.length === 0
    ) {
        throw new Error(
            "No readable image pages were found in this TIFF."
        );
    }

    if (
        ifds.length > MAX_PAGES
    ) {
        throw new Error(
            `This TIFF contains ${ifds.length} pages. Browser mode currently supports up to ${MAX_PAGES} pages at once.`
        );
    }

    const pages = [];

    for (
        let index = 0;
        index < ifds.length;
        index += 1
    ) {
        const ifd =
            ifds[index];

        UTIF.decodeImage(
            buffer,
            ifd
        );

        const width =
            Number(ifd.width);

        const height =
            Number(ifd.height);

        if (
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width < 1 ||
            height < 1
        ) {
            throw new Error(
                `TIFF page ${index + 1
                } has invalid dimensions.`
            );
        }

        if (
            width * height >
            MAX_PAGE_PIXELS
        ) {
            throw new Error(
                `TIFF page ${index + 1
                } is too large for safe browser processing.`
            );
        }

        const rgba =
            UTIF.toRGBA8(ifd);

        const sourceCanvas =
            document.createElement(
                "canvas"
            );

        sourceCanvas.width =
            width;

        sourceCanvas.height =
            height;

        const sourceContext =
            sourceCanvas.getContext(
                "2d"
            );

        if (!sourceContext) {
            throw new Error(
                "TIFF rendering is not supported in this browser."
            );
        }

        const clamped =
            new Uint8ClampedArray(
                rgba.buffer,
                rgba.byteOffset,
                rgba.byteLength
            );

        const imageData =
            new ImageData(
                clamped,
                width,
                height
            );

        sourceContext.putImageData(
            imageData,
            0,
            0
        );

        const outputCanvas =
            document.createElement(
                "canvas"
            );

        outputCanvas.width =
            width;

        outputCanvas.height =
            height;

        const outputContext =
            outputCanvas.getContext(
                "2d"
            );

        if (!outputContext) {
            throw new Error(
                "TIFF output rendering is not supported."
            );
        }

        if (
            outputMimeType ===
            "image/jpeg"
        ) {
            outputContext.fillStyle =
                "#ffffff";

            outputContext.fillRect(
                0,
                0,
                width,
                height
            );
        }

        outputContext.drawImage(
            sourceCanvas,
            0,
            0
        );

        const blob =
            await canvasToBlob(
                outputCanvas,
                outputMimeType,
                quality
            );

        const extension =
            outputMimeType ===
                "image/png"
                ? "png"
                : "jpg";

        const suffix =
            ifds.length === 1
                ? "converted"
                : `page-${index + 1}`;

        pages.push({
            blob,

            filename:
                `${getBaseName(
                    file.name
                )}-${suffix}.${extension}`,

            page:
                index + 1,

            width,
            height,

            outputSize:
                blob.size,

            mimeType:
                blob.type,
        });
    }

    let zipBlob = null;

    if (pages.length > 1) {
        const zip =
            new JSZip();

        for (const page of pages) {
            zip.file(
                page.filename,
                page.blob
            );
        }

        zipBlob =
            await zip.generateAsync({
                type: "blob",

                compression:
                    "DEFLATE",

                compressionOptions: {
                    level: 6,
                },
            });
    }

    return {
        originalSize:
            file.size,

        pageCount:
            pages.length,

        pages,

        zipBlob,

        outputMimeType,

        quality:
            outputMimeType ===
                "image/jpeg"
                ? Math.round(
                    quality * 100
                )
                : null,
    };
}