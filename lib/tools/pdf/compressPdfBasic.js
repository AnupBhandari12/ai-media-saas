import { loadPdfJs } from "@/lib/tools/pdf/pdfJs";
import { loadPdfLib } from "@/lib/tools/pdf/pdfLib";

const MAX_FILE_SIZE =
    30 * 1024 * 1024;

const MAX_PAGES = 25;

export const PDF_COMPRESSION_PRESETS = {
    SMALL: {
        label: "Smaller File",
        scale: 0.9,
        quality: 0.55,
    },

    BALANCED: {
        label: "Balanced",
        scale: 1.2,
        quality: 0.72,
    },

    QUALITY: {
        label: "Better Quality",
        scale: 1.5,
        quality: 0.82,
    },
};

function isPdfFile(file) {
    return (
        file?.type ===
        "application/pdf" ||
        file?.name
            ?.toLowerCase()
            .endsWith(".pdf")
    );
}

function canvasToJpegBlob(
    canvas,
    quality
) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "The browser could not create a compressed PDF page."
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

function friendlyError(error) {
    if (
        error?.name ===
        "PasswordException"
    ) {
        return new Error(
            "This PDF is password protected. Password handling will use the dedicated worker tool later."
        );
    }

    if (
        error instanceof Error
    ) {
        return error;
    }

    return new Error(
        "The PDF could not be compressed."
    );
}

export async function compressPdfBasic(
    file,
    {
        preset = "BALANCED",
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
            "PDF must be 30 MB or smaller for browser compression."
        );
    }

    const settings =
        PDF_COMPRESSION_PRESETS[
        preset
        ];

    if (!settings) {
        throw new Error(
            "Choose a valid compression preset."
        );
    }

    let pdfDocument = null;

    try {
        const pdfjs =
            await loadPdfJs();

        const {
            PDFDocument,
        } = await loadPdfLib();

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

        if (
            pdfDocument.numPages >
            MAX_PAGES
        ) {
            throw new Error(
                `Browser compression currently supports up to ${MAX_PAGES} pages per PDF.`
            );
        }

        const outputDocument =
            await PDFDocument.create();

        for (
            let pageNumber = 1;
            pageNumber <=
            pdfDocument.numPages;
            pageNumber += 1
        ) {
            const page =
                await pdfDocument.getPage(
                    pageNumber
                );

            try {
                const renderViewport =
                    page.getViewport({
                        scale:
                            settings.scale,
                    });

                const baseViewport =
                    page.getViewport({
                        scale: 1,
                    });

                const canvas =
                    document.createElement(
                        "canvas"
                    );

                canvas.width =
                    Math.ceil(
                        renderViewport.width
                    );

                canvas.height =
                    Math.ceil(
                        renderViewport.height
                    );

                const context =
                    canvas.getContext(
                        "2d"
                    );

                if (!context) {
                    throw new Error(
                        "PDF rendering is not supported in this browser."
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

                await page.render({
                    canvasContext:
                        context,

                    viewport:
                        renderViewport,

                    background:
                        "#ffffff",
                }).promise;

                const jpegBlob =
                    await canvasToJpegBlob(
                        canvas,
                        settings.quality
                    );

                const jpegBytes =
                    await jpegBlob.arrayBuffer();

                const embeddedImage =
                    await outputDocument.embedJpg(
                        jpegBytes
                    );

                const outputPage =
                    outputDocument.addPage([
                        baseViewport.width,
                        baseViewport.height,
                    ]);

                outputPage.drawImage(
                    embeddedImage,
                    {
                        x: 0,
                        y: 0,

                        width:
                            baseViewport.width,

                        height:
                            baseViewport.height,
                    }
                );

                canvas.width = 1;
                canvas.height = 1;
            } finally {
                page.cleanup();
            }
        }

        outputDocument.setTitle(
            "AI Media Compressed PDF"
        );

        outputDocument.setCreator(
            "AI Media by Bhanova Technologies"
        );

        const outputBytes =
            await outputDocument.save({
                useObjectStreams: true,
            });

        const compressedBlob =
            new Blob(
                [outputBytes],
                {
                    type:
                        "application/pdf",
                }
            );

        const keptOriginal =
            compressedBlob.size >=
            file.size;

        const blob =
            keptOriginal
                ? new Blob(
                    [
                        await file.arrayBuffer(),
                    ],
                    {
                        type:
                            "application/pdf",
                    }
                )
                : compressedBlob;

        const savedBytes =
            Math.max(
                0,
                file.size - blob.size
            );

        const savedPercent =
            file.size > 0
                ? Math.round(
                    (savedBytes /
                        file.size) *
                    100
                )
                : 0;

        return {
            blob,

            pageCount:
                pdfDocument.numPages,

            originalSize:
                file.size,

            outputSize:
                blob.size,

            savedBytes,

            savedPercent,

            preset,

            presetLabel:
                settings.label,

            keptOriginal,

            rasterized:
                !keptOriginal,
        };
    } catch (error) {
        throw friendlyError(
            error
        );
    } finally {
        if (pdfDocument) {
            await pdfDocument.destroy();
        }
    }
}