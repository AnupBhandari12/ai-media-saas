const MAX_DIMENSION = 12000;
const MAX_OUTPUT_PIXELS = 40_000_000;

function canvasToBlob(canvas, mimeType) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error("The browser could not create the resized image.")
          );
          return;
        }

        resolve(blob);
      },
      mimeType,
      0.92
    );
  });
}

export async function resizeImageByPixels(
  file,
  width,
  height
) {
  if (!file) {
    throw new Error("No image file was provided.");
  }

  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (!supportedTypes.includes(file.type)) {
    throw new Error("Unsupported image format.");
  }

  const outputWidth = Math.round(Number(width));
  const outputHeight = Math.round(Number(height));

  if (
    !Number.isFinite(outputWidth) ||
    !Number.isFinite(outputHeight) ||
    outputWidth < 1 ||
    outputHeight < 1
  ) {
    throw new Error(
      "Please enter valid width and height values."
    );
  }

  if (
    outputWidth > MAX_DIMENSION ||
    outputHeight > MAX_DIMENSION
  ) {
    throw new Error(
      `Width and height must be ${MAX_DIMENSION}px or smaller.`
    );
  }

  if (
    outputWidth * outputHeight >
    MAX_OUTPUT_PIXELS
  ) {
    throw new Error(
      "The requested image dimensions are too large to process safely in the browser."
    );
  }

  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement("canvas");

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Image processing is not supported in this browser."
      );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(
      bitmap,
      0,
      0,
      outputWidth,
      outputHeight
    );

    const blob = await canvasToBlob(
      canvas,
      file.type
    );

    return {
      blob,
      originalSize: file.size,
      resizedSize: blob.size,

      originalWidth: bitmap.width,
      originalHeight: bitmap.height,

      width: outputWidth,
      height: outputHeight,

      mimeType: blob.type,
    };
  } finally {
    bitmap.close();
  }
}