import { loadPdfLib } from "@/lib/tools/pdf/pdfLib";
import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";

const MAX_FILE_SIZE = 30 * 1024 * 1024;
const MAX_DOCUMENT_PAGES = 200;
const MAX_CROP_PAGES = 60;
const MAX_DECORATION_PAGES = 100;
const MAX_LOGO_SIZE = 5 * 1024 * 1024;

function validatePdfFile(file) {
    if (!file) {
        throw new Error("No PDF file was provided.");
    }

    const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
        throw new Error("Please choose a PDF file.");
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(
            "PDF must be 30 MB or smaller for browser processing."
        );
    }
}

async function loadDocument(file) {
    validatePdfFile(file);

    const { PDFDocument } = await loadPdfLib();

    try {
        const document = await PDFDocument.load(
            await file.arrayBuffer()
        );

        if (
            document.getPageCount() >
            MAX_DOCUMENT_PAGES
        ) {
            throw new Error(
                `Browser mode currently supports PDFs up to ${MAX_DOCUMENT_PAGES} pages.`
            );
        }

        return document;
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message.toLowerCase()
                : "";

        if (message.includes("encrypted")) {
            throw new Error(
                "This PDF is password protected. Password processing will use the dedicated worker tool later."
            );
        }

        throw error;
    }
}

async function saveDocument(document) {
    const bytes = await document.save({
        useObjectStreams: true,
    });

    return new Blob([bytes], {
        type: "application/pdf",
    });
}

function clamp(value, min, max) {
    return Math.min(
        max,
        Math.max(min, Number(value))
    );
}

function parseHexColor(hex) {
    const normalized = String(hex || "")
        .replace("#", "")
        .trim();

    if (!/^[0-9a-f]{6}$/i.test(normalized)) {
        throw new Error(
            "Choose a valid 6-digit color."
        );
    }

    return {
        r: parseInt(
            normalized.slice(0, 2),
            16
        ) / 255,

        g: parseInt(
            normalized.slice(2, 4),
            16
        ) / 255,

        b: parseInt(
            normalized.slice(4, 6),
            16
        ) / 255,
    };
}

function getCenteredRotationPosition(
    box,
    width,
    height,
    rotationDegrees
) {
    const radians =
        (rotationDegrees * Math.PI) / 180;

    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    const corners = [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
    ].map(([x, y]) => ({
        x: x * cos - y * sin,
        y: x * sin + y * cos,
    }));

    const xs = corners.map(
        (corner) => corner.x
    );

    const ys = corners.map(
        (corner) => corner.y
    );

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const centerX =
        box.x + box.width / 2;

    const centerY =
        box.y + box.height / 2;

    return {
        x:
            centerX -
            (minX + maxX) / 2,

        y:
            centerY -
            (minY + maxY) / 2,
    };
}

function getTextPosition(
    position,
    box,
    textWidth,
    fontSize,
    margin
) {
    let x =
        box.x +
        (box.width - textWidth) / 2;

    let y =
        box.y + margin;

    if (
        position.endsWith(
            "LEFT"
        )
    ) {
        x = box.x + margin;
    }

    if (
        position.endsWith(
            "RIGHT"
        )
    ) {
        x =
            box.x +
            box.width -
            margin -
            textWidth;
    }

    if (
        position.startsWith(
            "TOP"
        )
    ) {
        y =
            box.y +
            box.height -
            margin -
            fontSize;
    }

    return {
        x,
        y,
    };
}

export async function cropPdfPages(
    file,
    {
        pageSelection = "all",
        top = 0,
        right = 0,
        bottom = 0,
        left = 0,
    } = {}
) {
    const document =
        await loadDocument(file);

    const pageCount =
        document.getPageCount();

    const selectedPages =
        parsePageSelection(
            pageSelection,
            pageCount,
            MAX_CROP_PAGES
        );

    const crop = {
        top: clamp(top, 0, 40),
        right: clamp(right, 0, 40),
        bottom: clamp(bottom, 0, 40),
        left: clamp(left, 0, 40),
    };

    if (
        crop.left + crop.right >= 90
    ) {
        throw new Error(
            "Left and right crop together must leave at least 10% of the page visible."
        );
    }

    if (
        crop.top + crop.bottom >= 90
    ) {
        throw new Error(
            "Top and bottom crop together must leave at least 10% of the page visible."
        );
    }

    if (
        crop.top === 0 &&
        crop.right === 0 &&
        crop.bottom === 0 &&
        crop.left === 0
    ) {
        throw new Error(
            "Increase at least one crop margin."
        );
    }

    for (const pageNumber of selectedPages) {
        const page =
            document.getPage(
                pageNumber - 1
            );

        const box =
            page.getCropBox();

        const newX =
            box.x +
            box.width *
            (crop.left / 100);

        const newY =
            box.y +
            box.height *
            (crop.bottom / 100);

        const newWidth =
            box.width *
            (1 -
                crop.left / 100 -
                crop.right / 100);

        const newHeight =
            box.height *
            (1 -
                crop.top / 100 -
                crop.bottom / 100);

        page.setCropBox(
            newX,
            newY,
            newWidth,
            newHeight
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

        selectedPages,

        crop,

        nonDestructive:
            true,
    };
}

export async function addPdfPageNumbers(
    file,
    {
        pageSelection = "all",
        startNumber = 1,
        prefix = "",
        position = "BOTTOM_CENTER",
        fontSize = 12,
        margin = 24,
        colorHex = "#111827",
    } = {}
) {
    const document =
        await loadDocument(file);

    const pageCount =
        document.getPageCount();

    const selectedPages =
        parsePageSelection(
            pageSelection,
            pageCount,
            MAX_DECORATION_PAGES
        );

    const {
        StandardFonts,
        rgb,
    } = await loadPdfLib();

    const font =
        await document.embedFont(
            StandardFonts.Helvetica
        );

    const safeFontSize =
        clamp(
            fontSize,
            8,
            36
        );

    const safeMargin =
        clamp(
            margin,
            8,
            72
        );

    const safeStart =
        Math.max(
            0,
            Math.floor(
                Number(startNumber)
            )
        );

    const safePrefix =
        String(prefix || "").slice(
            0,
            30
        );

    const color =
        parseHexColor(
            colorHex
        );

    selectedPages.forEach(
        (
            pageNumber,
            index
        ) => {
            const page =
                document.getPage(
                    pageNumber - 1
                );

            const box =
                page.getCropBox();

            const text =
                `${safePrefix}${safeStart + index
                }`;

            const textWidth =
                font.widthOfTextAtSize(
                    text,
                    safeFontSize
                );

            const {
                x,
                y,
            } =
                getTextPosition(
                    position,
                    box,
                    textWidth,
                    safeFontSize,
                    safeMargin
                );

            page.drawText(text, {
                x,
                y,

                size:
                    safeFontSize,

                font,

                color: rgb(
                    color.r,
                    color.g,
                    color.b
                ),
            });
        }
    );

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

        selectedPages,

        startNumber:
            safeStart,

        prefix:
            safePrefix,

        position,

        fontSize:
            safeFontSize,
    };
}

export async function addPdfWatermark(
    file,
    {
        pageSelection = "all",
        type = "text",
        text = "",
        logoFile = null,
        opacityPercent = 25,
        rotationDegrees = 45,
        sizePercent = 30,
        colorHex = "#64748b",
    } = {}
) {
    const document =
        await loadDocument(file);

    const pageCount =
        document.getPageCount();

    const selectedPages =
        parsePageSelection(
            pageSelection,
            pageCount,
            MAX_DECORATION_PAGES
        );

    const {
        StandardFonts,
        degrees,
        rgb,
    } = await loadPdfLib();

    const opacity =
        clamp(
            opacityPercent,
            5,
            100
        ) / 100;

    const rotation =
        clamp(
            rotationDegrees,
            -90,
            90
        );

    const size =
        clamp(
            sizePercent,
            10,
            70
        );

    if (type === "text") {
        const safeText =
            String(text || "")
                .trim()
                .slice(0, 100);

        if (!safeText) {
            throw new Error(
                "Enter watermark text."
            );
        }

        const font =
            await document.embedFont(
                StandardFonts.HelveticaBold
            );

        const color =
            parseHexColor(
                colorHex
            );

        for (const pageNumber of selectedPages) {
            const page =
                document.getPage(
                    pageNumber - 1
                );

            const box =
                page.getCropBox();

            const targetWidth =
                box.width *
                (size / 100);

            const unitWidth =
                Math.max(
                    0.01,
                    font.widthOfTextAtSize(
                        safeText,
                        1
                    )
                );

            const fontSize =
                clamp(
                    targetWidth /
                    unitWidth,
                    8,
                    180
                );

            const textWidth =
                font.widthOfTextAtSize(
                    safeText,
                    fontSize
                );

            const textHeight =
                fontSize;

            const position =
                getCenteredRotationPosition(
                    box,
                    textWidth,
                    textHeight,
                    rotation
                );

            page.drawText(
                safeText,
                {
                    x: position.x,
                    y: position.y,

                    font,
                    size: fontSize,

                    color: rgb(
                        color.r,
                        color.g,
                        color.b
                    ),

                    opacity,

                    rotate:
                        degrees(
                            rotation
                        ),
                }
            );
        }
    } else if (
        type === "logo"
    ) {
        if (!logoFile) {
            throw new Error(
                "Choose a PNG or JPG logo."
            );
        }

        if (
            logoFile.size >
            MAX_LOGO_SIZE
        ) {
            throw new Error(
                "Logo must be 5 MB or smaller."
            );
        }

        const name =
            logoFile.name
                .toLowerCase();

        const isPng =
            logoFile.type ===
            "image/png" ||
            name.endsWith(".png");

        const isJpeg =
            logoFile.type ===
            "image/jpeg" ||
            name.endsWith(".jpg") ||
            name.endsWith(".jpeg");

        if (
            !isPng &&
            !isJpeg
        ) {
            throw new Error(
                "Logo must be PNG or JPG."
            );
        }

        const logoBytes =
            await logoFile.arrayBuffer();

        const embeddedLogo =
            isPng
                ? await document.embedPng(
                    logoBytes
                )
                : await document.embedJpg(
                    logoBytes
                );

        const dimensions =
            embeddedLogo.scale(1);

        for (const pageNumber of selectedPages) {
            const page =
                document.getPage(
                    pageNumber - 1
                );

            const box =
                page.getCropBox();

            let width =
                box.width *
                (size / 100);

            let height =
                dimensions.height *
                (width /
                    dimensions.width);

            const maxHeight =
                box.height * 0.7;

            if (
                height >
                maxHeight
            ) {
                const scale =
                    maxHeight /
                    height;

                width *= scale;
                height *= scale;
            }

            const position =
                getCenteredRotationPosition(
                    box,
                    width,
                    height,
                    rotation
                );

            page.drawImage(
                embeddedLogo,
                {
                    x: position.x,
                    y: position.y,

                    width,
                    height,

                    opacity,

                    rotate:
                        degrees(
                            rotation
                        ),
                }
            );
        }
    } else {
        throw new Error(
            "Watermark type must be text or logo."
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

        selectedPages,

        watermarkType:
            type,

        opacityPercent:
            Math.round(
                opacity * 100
            ),

        rotationDegrees:
            rotation,

        sizePercent:
            size,
    };
}