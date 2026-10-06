import { loadPdfLib } from "@/lib/tools/pdf/pdfLib";

const MAX_FILE_SIZE =
    30 * 1024 * 1024;

const MAX_PAGES = 60;

function validateFile(file) {
    if (!file) {
        throw new Error(
            "No PDF file was provided."
        );
    }

    const isPdf =
        file.type ===
        "application/pdf" ||
        file.name
            .toLowerCase()
            .endsWith(".pdf");

    if (!isPdf) {
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
}

async function loadDocument(
    file
) {
    validateFile(file);

    const {
        PDFDocument,
    } = await loadPdfLib();

    try {
        const bytes =
            await file.arrayBuffer();

        const document =
            await PDFDocument.load(
                bytes
            );

        if (
            document.getPageCount() >
            MAX_PAGES
        ) {
            throw new Error(
                `Page Organizer currently supports up to ${MAX_PAGES} pages.`
            );
        }

        return document;
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "";

        if (
            message
                .toLowerCase()
                .includes("encrypted")
        ) {
            throw new Error(
                "This PDF is password protected. Password processing will use the dedicated worker tool later."
            );
        }

        throw error;
    }
}

async function saveDocument(
    document
) {
    const bytes =
        await document.save({
            useObjectStreams: true,
        });

    return new Blob(
        [bytes],
        {
            type:
                "application/pdf",
        }
    );
}

export async function deletePdfPages(
    file,
    pagesToDelete
) {
    const sourceDocument =
        await loadDocument(
            file
        );

    const pageCount =
        sourceDocument.getPageCount();

    const uniquePages = [
        ...new Set(
            pagesToDelete.map(
                Number
            )
        ),
    ].sort(
        (a, b) => a - b
    );

    if (
        uniquePages.length === 0
    ) {
        throw new Error(
            "Select at least one page to delete."
        );
    }

    for (
        const page of
        uniquePages
    ) {
        if (
            page < 1 ||
            page > pageCount
        ) {
            throw new Error(
                `Page ${page} is outside this PDF.`
            );
        }
    }

    if (
        uniquePages.length >=
        pageCount
    ) {
        throw new Error(
            "You cannot delete every page. Keep at least one page."
        );
    }

    for (
        const page of
        [...uniquePages].sort(
            (a, b) => b - a
        )
    ) {
        sourceDocument.removePage(
            page - 1
        );
    }

    const blob =
        await saveDocument(
            sourceDocument
        );

    return {
        blob,

        originalSize:
            file.size,

        outputSize:
            blob.size,

        originalPageCount:
            pageCount,

        deletedPages:
            uniquePages,

        outputPageCount:
            sourceDocument.getPageCount(),
    };
}

export async function reorderPdfPages(
    file,
    pageOrder
) {
    const sourceDocument =
        await loadDocument(
            file
        );

    const pageCount =
        sourceDocument.getPageCount();

    if (
        !Array.isArray(
            pageOrder
        ) ||
        pageOrder.length !==
        pageCount
    ) {
        throw new Error(
            "The page order is incomplete."
        );
    }

    const unique =
        new Set(
            pageOrder
        );

    if (
        unique.size !==
        pageCount
    ) {
        throw new Error(
            "Each page must appear exactly once."
        );
    }

    for (
        const page of
        pageOrder
    ) {
        if (
            page < 1 ||
            page > pageCount
        ) {
            throw new Error(
                "The page order contains an invalid page."
            );
        }
    }

    const {
        PDFDocument,
    } = await loadPdfLib();

    const outputDocument =
        await PDFDocument.create();

    const copiedPages =
        await outputDocument.copyPages(
            sourceDocument,
            pageOrder.map(
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

    const blob =
        await saveDocument(
            outputDocument
        );

    return {
        blob,

        originalSize:
            file.size,

        outputSize:
            blob.size,

        pageCount,

        pageOrder,
    };
}

export async function rotatePdfPages(
    file,
    {
        selectedPages,
        degrees,
    }
) {
    const document =
        await loadDocument(
            file
        );

    const pageCount =
        document.getPageCount();

    const normalizedDegrees =
        ((Number(degrees) %
            360) +
            360) %
        360;

    if (
        ![
            90,
            180,
            270,
        ].includes(
            normalizedDegrees
        )
    ) {
        throw new Error(
            "Rotation must be 90°, 180°, or 270°."
        );
    }

    const pages = [
        ...new Set(
            selectedPages.map(
                Number
            )
        ),
    ];

    if (
        pages.length === 0
    ) {
        throw new Error(
            "Select at least one page to rotate."
        );
    }

    const {
        degrees:
        pdfDegrees,
    } = await loadPdfLib();

    for (
        const pageNumber of
        pages
    ) {
        if (
            pageNumber < 1 ||
            pageNumber >
            pageCount
        ) {
            throw new Error(
                `Page ${pageNumber} is outside this PDF.`
            );
        }

        const page =
            document.getPage(
                pageNumber - 1
            );

        const currentRotation =
            page.getRotation()
                .angle || 0;

        page.setRotation(
            pdfDegrees(
                (
                    currentRotation +
                    normalizedDegrees
                ) %
                360
            )
        );
    }

    const blob =
        await saveDocument(
            document
        );

    return {
        blob,

        originalSize:
            file.size,

        outputSize:
            blob.size,

        pageCount,

        selectedPages:
            pages.sort(
                (a, b) =>
                    a - b
            ),

        degrees:
            normalizedDegrees,
    };
}