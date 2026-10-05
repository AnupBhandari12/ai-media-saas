export async function compressImage(file, qualityPercent = 80) {
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

  const quality = Math.min(
    0.95,
    Math.max(0.4, qualityPercent / 100)
  );

  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement("canvas");

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Image processing is not supported in this browser.");
    }

    context.drawImage(bitmap, 0, 0);

    const compressedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("The image could not be compressed."));
            return;
          }

          resolve(blob);
        },
        file.type,
        quality
      );
    });

    const outputBlob =
      compressedBlob.size < file.size
        ? compressedBlob
        : file;

    return {
      blob: outputBlob,
      originalSize: file.size,
      compressedSize: outputBlob.size,
      width: bitmap.width,
      height: bitmap.height,
      mimeType: outputBlob.type,
      reduced: outputBlob.size < file.size,
    };
  } finally {
    bitmap.close();
  }
}