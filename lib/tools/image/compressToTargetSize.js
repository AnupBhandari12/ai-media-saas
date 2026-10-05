const MIN_QUALITY = 0.35;
const MAX_QUALITY = 0.95;

const MIN_SCALE = 0.3;
const SCALE_STEP = 0.1;

const QUALITY_SEARCH_STEPS = 8;

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error("The browser could not create the compressed image.")
          );
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

export async function compressToTargetSize(file, targetKb) {
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

  const safeTargetKb = Number(targetKb);

  if (!Number.isFinite(safeTargetKb) || safeTargetKb < 1) {
    throw new Error("Please enter a valid target size.");
  }

  const targetBytes = Math.round(safeTargetKb * 1024);

  const bitmap = await createImageBitmap(file);

  try {
    if (file.size <= targetBytes) {
      return {
        blob: file,
        originalSize: file.size,
        compressedSize: file.size,
        originalWidth: bitmap.width,
        originalHeight: bitmap.height,
        width: bitmap.width,
        height: bitmap.height,
        mimeType: file.type,
        targetBytes,
        reachedTarget: true,
        originalAlreadyFits: true,
        quality: null,
        scale: 1,
      };
    }

    const outputMimeType =
      file.type === "image/png"
        ? "image/webp"
        : file.type;

    let bestResult = null;

    for (
      let scale = 1;
      scale >= MIN_SCALE;
      scale = Number((scale - SCALE_STEP).toFixed(2))
    ) {
      const width = Math.max(
        1,
        Math.round(bitmap.width * scale)
      );

      const height = Math.max(
        1,
        Math.round(bitmap.height * scale)
      );

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Image processing is not supported in this browser."
        );
      }

      context.drawImage(
        bitmap,
        0,
        0,
        width,
        height
      );

      let low = MIN_QUALITY;
      let high = MAX_QUALITY;

      let bestAtThisScale = null;

      for (
        let attempt = 0;
        attempt < QUALITY_SEARCH_STEPS;
        attempt += 1
      ) {
        const quality = (low + high) / 2;

        const blob = await canvasToBlob(
          canvas,
          outputMimeType,
          quality
        );

        if (
          !bestResult ||
          Math.abs(blob.size - targetBytes) <
            Math.abs(bestResult.blob.size - targetBytes)
        ) {
          bestResult = {
            blob,
            quality,
            width,
            height,
            scale,
          };
        }

        if (blob.size <= targetBytes) {
          bestAtThisScale = {
            blob,
            quality,
            width,
            height,
            scale,
          };

          low = quality;
        } else {
          high = quality;
        }
      }

      if (bestAtThisScale) {
        return {
          blob: bestAtThisScale.blob,
          originalSize: file.size,
          compressedSize: bestAtThisScale.blob.size,
          originalWidth: bitmap.width,
          originalHeight: bitmap.height,
          width: bestAtThisScale.width,
          height: bestAtThisScale.height,
          mimeType: bestAtThisScale.blob.type,
          targetBytes,
          reachedTarget: true,
          originalAlreadyFits: false,
          quality: Math.round(
            bestAtThisScale.quality * 100
          ),
          scale: bestAtThisScale.scale,
        };
      }
    }

    if (!bestResult) {
      throw new Error(
        "The image could not be compressed."
      );
    }

    return {
      blob: bestResult.blob,
      originalSize: file.size,
      compressedSize: bestResult.blob.size,
      originalWidth: bitmap.width,
      originalHeight: bitmap.height,
      width: bestResult.width,
      height: bestResult.height,
      mimeType: bestResult.blob.type,
      targetBytes,
      reachedTarget:
        bestResult.blob.size <= targetBytes,
      originalAlreadyFits: false,
      quality: Math.round(
        bestResult.quality * 100
      ),
      scale: bestResult.scale,
    };
  } finally {
    bitmap.close();
  }
}