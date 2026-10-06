import { loadPdfJs } from "@/lib/tools/pdf/pdfJs";

import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";

import {
    combinePdfPageTexts,
    countWords,
} from "@/lib/tools/pdf/textUtils";

const MAX_FILE_SIZE =
    20 * 1024 * 1024;

const MAX_OCR_PAGES = 10;

const MAX_RENDER_PIXELS =
    14_000_000;

const OCR_LANGUAGES = {
    eng: {
        workerLanguages: "eng",
        label: "English",
    },

    nep: {
        workerLanguages: "nep",
        label: "Nepali",
    },

    "eng+nep": {
        workerLanguages: [
            "eng",
            "nep",
        ],
        label:
            "English + Nepali",
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

function friendlyError(
    error
) {
    if (
        error?.name ===
        "PasswordException"
    ) {
        return new Error(
            "This PDF is password protected. Unlocking will use the dedicated worker tool later."
        );
    }

    if (
        error instanceof Error
    ) {
        return error;
    }

    return new Error(
        "OCR processing failed."
    );
}

function getRenderScale(
    page
) {
    const baseViewport =
        page.getViewport({
            scale: 1,
        });

    const desiredScale =
        1.75;

    const desiredPixels =
        baseViewport.width *
        desiredScale *
        baseViewport.height *
        desiredScale;

    if (
        desiredPixels <=
        MAX_RENDER_PIXELS
    ) {
        return desiredScale;
    }

    const basePixels =
        baseViewport.width *
        baseViewport.height;

    return Math.max(
        1,
        Math.sqrt(
            MAX_RENDER_PIXELS /
            basePixels
        )
    );
}

export async function ocrPdfToText(
    file,
    {
        pageSelection = "all",
        language = "eng",
        onProgress,
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
            "OCR supports PDFs up to 20 MB in browser mode."
        );
    }

    const languageConfig =
        OCR_LANGUAGES[
        language
        ];

    if (!languageConfig) {
        throw new Error(
            "Choose a supported OCR language."
        );
    }

    let pdfDocument = null;
    let worker = null;

    try {
        const pdfjs =
            await loadPdfJs();

        const bytes =
            new Uint8Array(
                await file.arrayBuffer()
            );

        pdfDocument =
            await pdfjs.getDocument({
                data: bytes,
            }).promise;

        const selectedPages =
            parsePageSelection(
                pageSelection,
                pdfDocument.numPages,
                MAX_OCR_PAGES
            );

        const tesseractModule =
            await import(
                "tesseract.js"
            );

        const createWorker =
            tesseractModule.createWorker ||
            tesseractModule.default
                ?.createWorker;

        if (!createWorker) {
            throw new Error(
                "OCR engine could not be loaded."
            );
        }

        onProgress?.({
            stage:
                "Loading OCR engine",
            progress: 0,
            currentPage: 0,
            totalPages:
                selectedPages.length,
        });

        worker =
            await createWorker(
                languageConfig.workerLanguages,
                undefined,
                {
                    logger: (message) => {
                        onProgress?.({
                            stage:
                                message.status ||
                                "OCR processing",

                            progress:
                                typeof message.progress ===
                                    "number"
                                    ? message.progress
                                    : 0,
                        });
                    },
                }
            );

        const pageTexts = [];

        const confidences = [];

        for (
            let index = 0;
            index <
            selectedPages.length;
            index += 1
        ) {
            const pageNumber =
                selectedPages[index];

            onProgress?.({
                stage: `Preparing page ${pageNumber}`,
                progress: 0,
                currentPage:
                    index + 1,
                totalPages:
                    selectedPages.length,
            });

            const page =
                await pdfDocument.getPage(
                    pageNumber
                );

            try {
                const scale =
                    getRenderScale(
                        page
                    );

                const viewport =
                    page.getViewport({
                        scale,
                    });

                const canvas =
                    document.createElement(
                        "canvas"
                    );

                canvas.width =
                    Math.ceil(
                        viewport.width
                    );

                canvas.height =
                    Math.ceil(
                        viewport.height
                    );

                const context =
                    canvas.getContext(
                        "2d",
                        {
                            willReadFrequently:
                                true,
                        }
                    );

                if (!context) {
                    throw new Error(
                        "OCR rendering is not supported in this browser."
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

                    viewport,

                    background:
                        "#ffffff",
                }).promise;

                onProgress?.({
                    stage: `Recognizing page ${pageNumber}`,
                    progress: 0,
                    currentPage:
                        index + 1,
                    totalPages:
                        selectedPages.length,
                });

                const recognition =
                    await worker.recognize(
                        canvas
                    );

                const pageText =
                    String(
                        recognition.data
                            ?.text || ""
                    ).trim();

                pageTexts.push({
                    pageNumber,
                    text: pageText,
                });

                const confidence =
                    Number(
                        recognition.data
                            ?.confidence
                    );

                if (
                    Number.isFinite(
                        confidence
                    )
                ) {
                    confidences.push(
                        confidence
                    );
                }

                canvas.width = 1;
                canvas.height = 1;
            } finally {
                page.cleanup();
            }
        }

        const contentOnly =
            pageTexts
                .map(
                    (page) =>
                        page.text
                )
                .join("\n")
                .trim();

        if (!contentOnly) {
            throw new Error(
                "OCR finished but no readable text was detected. Try a clearer scan or another OCR language."
            );
        }

        const text =
            combinePdfPageTexts(
                pageTexts
            );

        const averageConfidence =
            confidences.length
                ? Math.round(
                    confidences.reduce(
                        (
                            sum,
                            value
                        ) =>
                            sum +
                            value,
                        0
                    ) /
                    confidences.length
                )
                : null;

        return {
            text,

            pageTexts,

            pageCount:
                pdfDocument.numPages,

            selectedPages,

            processedPageCount:
                selectedPages.length,

            wordCount:
                countWords(
                    contentOnly
                ),

            characterCount:
                contentOnly.length,

            averageConfidence,

            language,

            languageLabel:
                languageConfig.label,

            originalSize:
                file.size,
        };
    } catch (error) {
        throw friendlyError(
            error
        );
    } finally {
        if (worker) {
            await worker.terminate();
        }

        if (pdfDocument) {
            await pdfDocument.destroy();
        }
    }
}