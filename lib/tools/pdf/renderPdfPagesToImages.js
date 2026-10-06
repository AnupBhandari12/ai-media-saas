import JSZip from "jszip";

import { loadPdfJs } from "@/lib/tools/pdf/pdfJs";
import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";

const MAX_FILE_SIZE =
    30 * 1024 * 1024;

const MAX_RENDER_PAGES = 25;

const MAX_PAGE_PIXELS =
    20_000_000;

const SUPPORTED_FORMATS = {
    jpg: {
        mimeType:
            "image/jpeg",

        extension:
            "jpg",
    },

    png: {
        mimeType:
            "image/png",

        extension:
            "png",
    },
};

function isPdfFile(file) {
    if (!file) {
        return false;
    }

    return (
        file.type ===
        "application/pdf" ||
        file.name
            .toLowerCase()
            .endsWith(".pdf")
    );
}

function getBaseName(name) {
    const dot =
        name.lastIndexOf(".");

    return dot > 0
        ? name.slice(0, dot)
        : name;
}

function canvasToBlob(
    canvas,
    mimeType,
    quality
) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "The browser could not create one of the page images."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },

                mimeType,

                mimeType ===
                    "image/jpeg"
                    ? quality
                    : undefined
            );
        }
    );
}

function friendlyPdfError(
    error
) {
    if (
        error?.name ===
        "PasswordException"
    ) {
        return new Error(
            "This PDF is password protected. Password unlock will use the dedicated worker tool later."
        );
    }

    if (
        error?.name ===
        "InvalidPDFException"
    ) {
        return new Error(
            "This file is not a valid or readable PDF."
        );
    }

    if (
        error?.name ===
        "MissingPDFException"
    ) {
        return new Error(
            "The PDF could not be loaded."
        );
    }

    if (
        error instanceof Error
    ) {
        return error;
    }

    return new Error(
        "The PDF could not be processed."
    );
}

export async function inspectPdfFile(
    file
) {
    if (!file) {
        throw new Error(
            "No PDF file was provided."
        );
    }

    if (!isPdfFile(file)) {
        throw new Error(
            "Please choose a PDF file."
        );
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "PDF must be 30 MB or smaller for browser conversion."
        );
    }

    let pdfDocument = null;

    try {
        const pdfjs =
            await loadPdfJs();

        const bytes =
            new Uint8Array(
                await file.arrayBuffer()
            );

        const loadingTask =
            pdfjs.getDocument({
                data: bytes,
            });

        pdfDocument =
            await loadingTask.promise;

        return {
            fileName:
                file.name,

            fileSize:
                file.size,

            pageCount:
                pdfDocument.numPages,

            maxPagesPerRun:
                MAX_RENDER_PAGES,
        };
    } catch (error) {
        throw friendlyPdfError(
            error
        );
    } finally {
        if (pdfDocument) {
            await pdfDocument.destroy();
        }
    }
}

export async function renderPdfPagesToImages(
    file,
    {
        format = "jpg",
        pageSelection = "all",
        scale = 1.5,
        qualityPercent = 90,
    } = {}
) {
    if (!file) {
        throw new Error(
            "No PDF file was provided."
        );
    }

    if (!isPdfFile(file)) {
        throw new Error(
            "Please choose a PDF file."
        );
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            "PDF must be 30 MB or smaller for browser conversion."
        );
    }

    const formatConfig =
        SUPPORTED_FORMATS[
        format
        ];

    if (!formatConfig) {
        throw new Error(
            "Output format must be JPG or PNG."
        );
    }

    const safeScale =
        Math.min(
            2,
            Math.max(
                1,
                Number(scale)
            )
        );

    const quality =
        Math.min(
            0.95,
            Math.max(
                0.6,
                Number(
                    qualityPercent
                ) / 100
            )
        );

    let pdfDocument = null;

    try {
        const pdfjs =
            await loadPdfJs();

        const bytes =
            new Uint8Array(
                await file.arrayBuffer()
            );

        const loadingTask =
            pdfjs.getDocument({
                data: bytes,
            });

        pdfDocument =
            await loadingTask.promise;

        const selectedPages =
            parsePageSelection(
                pageSelection,
                pdfDocument.numPages,
                MAX_RENDER_PAGES
            );

        const baseName =
            getBaseName(
                file.name
            );

        const results = [];

        for (
            const pageNumber of
            selectedPages
        ) {
            const page =
                await pdfDocument.getPage(
                    pageNumber
                );

            try {
                const viewport =
                    page.getViewport({
                        scale:
                            safeScale,
                    });

                const width =
                    Math.ceil(
                        viewport.width
                    );

                const height =
                    Math.ceil(
                        viewport.height
                    );

                if (
                    width *
                    height >
                    MAX_PAGE_PIXELS
                ) {
                    throw new Error(
                        `Page ${pageNumber} is too large to render safely at this quality. Choose a lower render quality.`
                    );
                }

                const canvas =
                    document.createElement(
                        "canvas"
                    );

                canvas.width =
                    width;

                canvas.height =
                    height;

                const context =
                    canvas.getContext(
                        "2d"
                    );

                if (!context) {
                    throw new Error(
                        "PDF page rendering is not supported in this browser."
                    );
                }

                if (
                    formatConfig.mimeType ===
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

                const renderTask =
                    page.render({
                        canvasContext:
                            context,

                        viewport,

                        ...(formatConfig.mimeType ===
                            "image/jpeg"
                            ? {
                                background:
                                    "#ffffff",
                            }
                            : {}),
                    });

                await renderTask.promise;

                const blob =
                    await canvasToBlob(
                        canvas,
                        formatConfig.mimeType,
                        quality
                    );

                const paddedPage =
                    String(
                        pageNumber
                    ).padStart(
                        3,
                        "0"
                    );

                const filename =
                    `${baseName}-page-${paddedPage}.${formatConfig.extension}`;

                results.push({
                    pageNumber,

                    filename,

                    blob,

                    width,
                    height,

                    size:
                        blob.size,

                    mimeType:
                        blob.type ||
                        formatConfig.mimeType,
                });

                canvas.width = 1;
                canvas.height = 1;
            } finally {
                page.cleanup();
            }
        }

        let zipBlob = null;

        if (
            results.length >
            1
        ) {
            const zip =
                new JSZip();

            for (
                const result of
                results
            ) {
                zip.file(
                    result.filename,
                    result.blob
                );
            }

            zipBlob =
                await zip.generateAsync(
                    {
                        type: "blob",

                        compression:
                            "DEFLATE",

                        compressionOptions: {
                            level: 6,
                        },
                    }
                );
        }

        const outputSize =
            results.reduce(
                (sum, item) =>
                    sum +
                    item.size,
                0
            );

        return {
            results,

            zipBlob,

            pageCount:
                pdfDocument.numPages,

            selectedPages,

            convertedPageCount:
                results.length,

            originalSize:
                file.size,

            outputSize,

            format,

            mimeType:
                formatConfig.mimeType,

            scale:
                safeScale,

            quality:
                format === "jpg"
                    ? Math.round(
                        quality * 100
                    )
                    : null,
        };
    } catch (error) {
        throw friendlyPdfError(
            error
        );
    } finally {
        if (pdfDocument) {
            await pdfDocument.destroy();
        }
    }
}