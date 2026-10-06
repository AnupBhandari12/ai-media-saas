import { loadPdfJs } from "@/lib/tools/pdf/pdfJs";

const MAX_FILE_SIZE =
    30 * 1024 * 1024;

const MAX_PAGES = 60;

function isPdfFile(file) {
    return (
        file?.type ===
        "application/pdf" ||
        file?.name
            ?.toLowerCase()
            .endsWith(".pdf")
    );
}

function canvasToBlob(canvas) {
    return new Promise(
        (resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(
                            new Error(
                                "Could not create a page preview."
                            )
                        );

                        return;
                    }

                    resolve(blob);
                },
                "image/jpeg",
                0.75
            );
        }
    );
}

export async function renderPdfThumbnails(
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
            "PDF must be 30 MB or smaller."
        );
    }

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

    let pdfDocument;

    try {
        pdfDocument =
            await loadingTask.promise;

        if (
            pdfDocument.numPages >
            MAX_PAGES
        ) {
            throw new Error(
                `Page Organizer currently supports up to ${MAX_PAGES} pages per PDF.`
            );
        }

        const pages = [];

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
                const viewport =
                    page.getViewport({
                        scale: 0.35,
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
                        "2d"
                    );

                if (!context) {
                    throw new Error(
                        "PDF preview rendering is not supported in this browser."
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

                const thumbnailBlob =
                    await canvasToBlob(
                        canvas
                    );

                pages.push({
                    pageNumber,

                    width:
                        canvas.width,

                    height:
                        canvas.height,

                    thumbnailBlob,
                });

                canvas.width = 1;
                canvas.height = 1;
            } finally {
                page.cleanup();
            }
        }

        return {
            pageCount:
                pdfDocument.numPages,

            fileSize:
                file.size,

            pages,
        };
    } catch (error) {
        if (
            error?.name ===
            "PasswordException"
        ) {
            throw new Error(
                "This PDF is password protected. Password processing will use the dedicated worker tool later."
            );
        }

        throw error;
    } finally {
        if (pdfDocument) {
            await pdfDocument.destroy();
        }
    }
}