import JSZip from "jszip";

import { loadPdfLib } from "@/lib/tools/pdf/pdfLib";

import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";

import { parseSplitRanges } from "@/lib/tools/pdf/splitRanges";

const MAX_FILE_SIZE =
    30 * 1024 * 1024;

const MAX_MERGE_FILES = 10;

const MAX_MERGE_TOTAL_SIZE =
    75 * 1024 * 1024;

const MAX_MERGE_PAGES =
    200;

const MAX_EXTRACT_PAGES =
    100;

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

function validatePdfFile(
    file
) {
    if (!file) {
        throw new Error(
            "No PDF file was provided."
        );
    }

    if (!isPdfFile(file)) {
        throw new Error(
            `"${file.name}" is not a PDF file.`
        );
    }

    if (
        file.size >
        MAX_FILE_SIZE
    ) {
        throw new Error(
            `"${file.name}" is larger than 30 MB.`
        );
    }
}

function getBaseName(name) {
    const dot =
        name.lastIndexOf(".");

    return dot > 0
        ? name.slice(0, dot)
        : name;
}

function friendlyPdfError(
    error
) {
    const message =
        error instanceof Error
            ? error.message
            : "";

    if (
        message
            .toLowerCase()
            .includes("encrypted")
    ) {
        return new Error(
            "This PDF is password protected. Password-protected PDF processing will use the dedicated worker tool later."
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

async function loadSourcePdf(
    file
) {
    validatePdfFile(file);

    const {
        PDFDocument,
    } = await loadPdfLib();

    try {
        const bytes =
            await file.arrayBuffer();

        return await PDFDocument.load(
            bytes
        );
    } catch (error) {
        throw friendlyPdfError(
            error
        );
    }
}

export async function inspectPdfForManipulation(
    file
) {
    const pdfDocument =
        await loadSourcePdf(file);

    return {
        fileName:
            file.name,

        fileSize:
            file.size,

        pageCount:
            pdfDocument.getPageCount(),
    };
}

export async function mergePdfFiles(
    files
) {
    if (
        !Array.isArray(files) ||
        files.length < 2
    ) {
        throw new Error(
            "Choose at least two PDF files to merge."
        );
    }

    if (
        files.length >
        MAX_MERGE_FILES
    ) {
        throw new Error(
            `You can merge up to ${MAX_MERGE_FILES} PDFs at once.`
        );
    }

    for (
        const file of files
    ) {
        validatePdfFile(file);
    }

    const originalTotalSize =
        files.reduce(
            (sum, file) =>
                sum + file.size,
            0
        );

    if (
        originalTotalSize >
        MAX_MERGE_TOTAL_SIZE
    ) {
        throw new Error(
            "Combined PDF size must be 75 MB or smaller."
        );
    }

    const {
        PDFDocument,
    } = await loadPdfLib();

    const outputDocument =
        await PDFDocument.create();

    let totalPageCount = 0;

    for (
        const file of files
    ) {
        const sourceDocument =
            await loadSourcePdf(
                file
            );

        const sourcePageCount =
            sourceDocument.getPageCount();

        totalPageCount +=
            sourcePageCount;

        if (
            totalPageCount >
            MAX_MERGE_PAGES
        ) {
            throw new Error(
                `Browser merge supports up to ${MAX_MERGE_PAGES} total pages per run.`
            );
        }

        const pageIndices =
            Array.from(
                {
                    length:
                        sourcePageCount,
                },
                (_, index) =>
                    index
            );

        const copiedPages =
            await outputDocument.copyPages(
                sourceDocument,
                pageIndices
            );

        for (
            const page of
            copiedPages
        ) {
            outputDocument.addPage(
                page
            );
        }
    }

    outputDocument.setTitle(
        "AI Media Merged PDF"
    );

    outputDocument.setCreator(
        "AI Media by Bhanova Technologies"
    );

    const bytes =
        await outputDocument.save({
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

        sourceCount:
            files.length,

        totalPageCount,

        originalTotalSize,

        outputSize:
            blob.size,
    };
}

export async function splitPdfByRanges(
    file,
    rangesInput
) {
    const sourceDocument =
        await loadSourcePdf(file);

    const pageCount =
        sourceDocument.getPageCount();

    const groups =
        parseSplitRanges(
            rangesInput,
            pageCount
        );

    const {
        PDFDocument,
    } = await loadPdfLib();

    const baseName =
        getBaseName(
            file.name
        );

    const results = [];

    for (
        const group of groups
    ) {
        const outputDocument =
            await PDFDocument.create();

        const pageIndices =
            group.pages.map(
                (page) =>
                    page - 1
            );

        const copiedPages =
            await outputDocument.copyPages(
                sourceDocument,
                pageIndices
            );

        for (
            const page of
            copiedPages
        ) {
            outputDocument.addPage(
                page
            );
        }

        const bytes =
            await outputDocument.save({
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

        results.push({
            label:
                group.label,

            pages:
                group.pages,

            pageCount:
                group.pages.length,

            filename:
                `${baseName}-pages-${group.label}.pdf`,

            blob,

            size:
                blob.size,
        });
    }

    let zipBlob = null;

    if (
        results.length > 1
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

    return {
        originalSize:
            file.size,

        pageCount,

        results,

        zipBlob,
    };
}

export async function extractPdfPages(
    file,
    pageSelection
) {
    const sourceDocument =
        await loadSourcePdf(file);

    const pageCount =
        sourceDocument.getPageCount();

    const selectedPages =
        parsePageSelection(
            pageSelection,
            pageCount,
            MAX_EXTRACT_PAGES
        );

    const {
        PDFDocument,
    } = await loadPdfLib();

    const outputDocument =
        await PDFDocument.create();

    const copiedPages =
        await outputDocument.copyPages(
            sourceDocument,
            selectedPages.map(
                (page) =>
                    page - 1
            )
        );

    for (
        const page of
        copiedPages
    ) {
        outputDocument.addPage(
            page
        );
    }

    outputDocument.setCreator(
        "AI Media by Bhanova Technologies"
    );

    const bytes =
        await outputDocument.save({
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

        originalSize:
            file.size,

        outputSize:
            blob.size,

        originalPageCount:
            pageCount,

        selectedPages,

        outputPageCount:
            selectedPages.length,
    };
}