import { loadPdfJs } from "@/lib/tools/pdf/pdfJs";

import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";

import {
    combinePdfPageTexts,
    countWords,
    normalizePdfTextItems,
} from "@/lib/tools/pdf/textUtils";

const MAX_FILE_SIZE =
    30 * 1024 * 1024;

const MAX_PAGES_PER_RUN =
    100;

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
            "This PDF is password protected. Password handling will use the dedicated worker tool later."
        );
    }

    if (
        error instanceof Error
    ) {
        return error;
    }

    return new Error(
        "Text extraction failed."
    );
}

export async function extractPdfText(
    file,
    {
        pageSelection = "all",
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
            "PDF must be 30 MB or smaller."
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

        const selectedPages =
            parsePageSelection(
                pageSelection,
                pdfDocument.numPages,
                MAX_PAGES_PER_RUN
            );

        const pageTexts = [];

        for (
            const pageNumber of
            selectedPages
        ) {
            const page =
                await pdfDocument.getPage(
                    pageNumber
                );

            try {
                const textContent =
                    await page.getTextContent();

                const text =
                    normalizePdfTextItems(
                        textContent.items
                    );

                pageTexts.push({
                    pageNumber,
                    text,
                });
            } finally {
                page.cleanup();
            }
        }

        const text =
            combinePdfPageTexts(
                pageTexts
            );

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
                "No selectable text was found. This may be a scanned PDF — try PDF OCR to Text instead."
            );
        }

        return {
            text,

            pageTexts,

            pageCount:
                pdfDocument.numPages,

            selectedPages,

            extractedPageCount:
                selectedPages.length,

            characterCount:
                contentOnly.length,

            wordCount:
                countWords(
                    contentOnly
                ),

            originalSize:
                file.size,
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