import { loadPdfLib } from "@/lib/tools/pdf/pdfLib";

const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_FILES = 15;
const MAX_FILE_SIZE =
  10 * 1024 * 1024;
const MAX_TOTAL_SIZE =
  50 * 1024 * 1024;
const MAX_IMAGE_PIXELS =
  40_000_000;

const PAGE_SIZES = {
  A4: [595.28, 841.89],
  LETTER: [612, 792],
};

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
                "The browser could not prepare one of the images."
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

async function normalizeImage(
  file,
  quality
) {
  const bitmap =
    await createImageBitmap(file);

  try {
    if (
      bitmap.width *
        bitmap.height >
      MAX_IMAGE_PIXELS
    ) {
      throw new Error(
        `"${file.name}" is too large to process safely in the browser.`
      );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = bitmap.width;
    canvas.height =
      bitmap.height;

    const context =
      canvas.getContext("2d");

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

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    context.drawImage(
      bitmap,
      0,
      0
    );

    const blob =
      await canvasToJpegBlob(
        canvas,
        quality
      );

    return {
      bytes:
        await blob.arrayBuffer(),

      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

function getFixedPageSize(
  pageSize,
  orientation,
  imageWidth,
  imageHeight
) {
  const base =
    PAGE_SIZES[pageSize] ||
    PAGE_SIZES.A4;

  let width = base[0];
  let height = base[1];

  const requestedOrientation =
    orientation === "AUTO"
      ? imageWidth >= imageHeight
        ? "LANDSCAPE"
        : "PORTRAIT"
      : orientation;

  if (
    requestedOrientation ===
    "LANDSCAPE"
  ) {
    [width, height] = [
      height,
      width,
    ];
  }

  return [width, height];
}

function getFitPageSize(
  imageWidth,
  imageHeight,
  margin
) {
  const pixelsToPoints = 0.75;

  const rawWidth =
    imageWidth *
    pixelsToPoints;

  const rawHeight =
    imageHeight *
    pixelsToPoints;

  const maxLongSide = 842;

  const scale = Math.min(
    1,
    maxLongSide /
      Math.max(
        rawWidth,
        rawHeight
      )
  );

  const contentWidth =
    rawWidth * scale;

  const contentHeight =
    rawHeight * scale;

  return [
    contentWidth +
      margin * 2,

    contentHeight +
      margin * 2,
  ];
}

export async function createPdfFromImages(
  files,
  {
    pageSize = "A4",
    orientation = "AUTO",
    margin = 36,
    qualityPercent = 90,
  } = {}
) {
  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {
    throw new Error(
      "Choose at least one image."
    );
  }

  if (files.length > MAX_FILES) {
    throw new Error(
      `You can add up to ${MAX_FILES} photos at once.`
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
      "Combined image size must be 50 MB or smaller."
    );
  }

  for (const file of files) {
    if (
      !SUPPORTED_TYPES.includes(
        file.type
      )
    ) {
      throw new Error(
        `"${file.name}" is not a supported JPG, PNG, or WebP image.`
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

  const safeMargin =
    Math.max(
      0,
      Math.min(
        72,
        Number(margin)
      )
    );

  const quality = Math.min(
    0.95,
    Math.max(
      0.6,
      Number(
        qualityPercent
      ) / 100
    )
  );

  const {
    PDFDocument,
  } = await loadPdfLib();

  const pdfDocument =
    await PDFDocument.create();

  pdfDocument.setTitle(
    "AI Media Photos PDF"
  );

  pdfDocument.setCreator(
    "AI Media by Bhanova Technologies"
  );

  for (const file of files) {
    const normalized =
      await normalizeImage(
        file,
        quality
      );

    const embeddedImage =
      await pdfDocument.embedJpg(
        normalized.bytes
      );

    let pageWidth;
    let pageHeight;

    if (pageSize === "FIT") {
      [
        pageWidth,
        pageHeight,
      ] = getFitPageSize(
        normalized.width,
        normalized.height,
        safeMargin
      );
    } else {
      [
        pageWidth,
        pageHeight,
      ] = getFixedPageSize(
        pageSize,
        orientation,
        normalized.width,
        normalized.height
      );
    }

    const page =
      pdfDocument.addPage([
        pageWidth,
        pageHeight,
      ]);

    const availableWidth =
      Math.max(
        1,
        pageWidth -
          safeMargin * 2
      );

    const availableHeight =
      Math.max(
        1,
        pageHeight -
          safeMargin * 2
      );

    const scale = Math.min(
      availableWidth /
        normalized.width,

      availableHeight /
        normalized.height
    );

    const drawWidth =
      normalized.width *
      scale;

    const drawHeight =
      normalized.height *
      scale;

    const x =
      (pageWidth -
        drawWidth) /
      2;

    const y =
      (pageHeight -
        drawHeight) /
      2;

    page.drawImage(
      embeddedImage,
      {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      }
    );
  }

  const bytes =
    await pdfDocument.save({
      useObjectStreams: true,
    });

  const blob = new Blob(
    [bytes],
    {
      type: "application/pdf",
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

    pageSize,

    orientation:
      pageSize === "FIT"
        ? "PER_IMAGE"
        : orientation,

    margin:
      safeMargin,

    quality:
      Math.round(
        quality * 100
      ),
  };
}