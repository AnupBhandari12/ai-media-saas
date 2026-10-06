const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function canvasToBlob(
  canvas,
  mimeType
) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "The browser could not create the transformed image."
              )
            );

            return;
          }

          resolve(blob);
        },
        mimeType,
        0.92
      );
    }
  );
}

export async function rotateFlipImage(
  file,
  {
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false,
  } = {}
) {
  if (!file) {
    throw new Error(
      "No image file was provided."
    );
  }

  if (
    !SUPPORTED_TYPES.includes(
      file.type
    )
  ) {
    throw new Error(
      "Unsupported image format."
    );
  }

  const normalizedRotation =
    ((Number(rotation) % 360) +
      360) %
    360;

  if (
    ![0, 90, 180, 270].includes(
      normalizedRotation
    )
  ) {
    throw new Error(
      "Rotation must be 0, 90, 180, or 270 degrees."
    );
  }

  const bitmap =
    await createImageBitmap(file);

  try {
    const swapsDimensions =
      normalizedRotation === 90 ||
      normalizedRotation === 270;

    const outputWidth =
      swapsDimensions
        ? bitmap.height
        : bitmap.width;

    const outputHeight =
      swapsDimensions
        ? bitmap.width
        : bitmap.height;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      outputWidth;

    canvas.height =
      outputHeight;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Image processing is not supported in this browser."
      );
    }

    context.imageSmoothingEnabled =
      true;

    context.imageSmoothingQuality =
      "high";

    context.translate(
      outputWidth / 2,
      outputHeight / 2
    );

    context.scale(
      flipHorizontal ? -1 : 1,
      flipVertical ? -1 : 1
    );

    context.rotate(
      (normalizedRotation *
        Math.PI) /
        180
    );

    context.drawImage(
      bitmap,
      -bitmap.width / 2,
      -bitmap.height / 2
    );

    const blob =
      await canvasToBlob(
        canvas,
        file.type
      );

    return {
      blob,

      originalSize:
        file.size,

      transformedSize:
        blob.size,

      originalWidth:
        bitmap.width,

      originalHeight:
        bitmap.height,

      width:
        outputWidth,

      height:
        outputHeight,

      rotation:
        normalizedRotation,

      flipHorizontal:
        Boolean(
          flipHorizontal
        ),

      flipVertical:
        Boolean(
          flipVertical
        ),

      mimeType:
        blob.type,
    };
  } finally {
    bitmap.close();
  }
}