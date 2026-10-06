const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function canvasToBlob(
  canvas,
  mimeType
) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "The browser could not create the watermarked image."
            )
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

function getPosition({
  position,
  canvasWidth,
  canvasHeight,
  itemWidth,
  itemHeight,
  margin,
}) {
  const left = margin;

  const centerX =
    (canvasWidth -
      itemWidth) /
    2;

  const right =
    canvasWidth -
    itemWidth -
    margin;

  const top = margin;

  const centerY =
    (canvasHeight -
      itemHeight) /
    2;

  const bottom =
    canvasHeight -
    itemHeight -
    margin;

  const map = {
    "top-left": [
      left,
      top,
    ],

    "top-center": [
      centerX,
      top,
    ],

    "top-right": [
      right,
      top,
    ],

    "center-left": [
      left,
      centerY,
    ],

    center: [
      centerX,
      centerY,
    ],

    "center-right": [
      right,
      centerY,
    ],

    "bottom-left": [
      left,
      bottom,
    ],

    "bottom-center": [
      centerX,
      bottom,
    ],

    "bottom-right": [
      right,
      bottom,
    ],
  };

  return (
    map[position] ||
    map["bottom-right"]
  );
}

export async function watermarkImage(
  file,
  {
    type = "text",
    text = "",
    watermarkFile = null,
    position = "bottom-right",
    opacity = 0.6,
    sizePercent = 8,
    color = "#ffffff",
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
      "Please use a JPG, PNG, or WebP image."
    );
  }

  if (
    type !== "text" &&
    type !== "image"
  ) {
    throw new Error(
      "Invalid watermark type."
    );
  }

  if (
    type === "text" &&
    !text.trim()
  ) {
    throw new Error(
      "Enter watermark text."
    );
  }

  if (
    type === "image" &&
    !watermarkFile
  ) {
    throw new Error(
      "Choose a watermark image."
    );
  }

  const bitmap =
    await createImageBitmap(file);

  let watermarkBitmap = null;

  try {
    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      bitmap.width;

    canvas.height =
      bitmap.height;

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Image processing is not supported in this browser."
      );
    }

    context.drawImage(
      bitmap,
      0,
      0
    );

    const safeOpacity =
      Math.min(
        1,
        Math.max(
          0.05,
          Number(opacity)
        )
      );

    const safeSizePercent =
      Math.min(
        50,
        Math.max(
          2,
          Number(sizePercent)
        )
      );

    const margin =
      Math.max(
        12,
        Math.round(
          Math.min(
            canvas.width,
            canvas.height
          ) * 0.03
        )
      );

    context.save();

    context.globalAlpha =
      safeOpacity;

    if (type === "text") {
      const fontSize =
        Math.max(
          14,
          Math.round(
            canvas.width *
              (
                safeSizePercent /
                100
              )
          )
        );

      context.font = `700 ${fontSize}px Arial, sans-serif`;

      context.textBaseline =
        "top";

      context.fillStyle =
        color;

      context.shadowColor =
        "rgba(0, 0, 0, 0.45)";

      context.shadowBlur =
        Math.max(
          2,
          Math.round(
            fontSize * 0.08
          )
        );

      const metrics =
        context.measureText(
          text
        );

      const textWidth =
        metrics.width;

      const textHeight =
        fontSize * 1.15;

      const [x, y] =
        getPosition({
          position,

          canvasWidth:
            canvas.width,

          canvasHeight:
            canvas.height,

          itemWidth:
            textWidth,

          itemHeight:
            textHeight,

          margin,
        });

      context.fillText(
        text,
        x,
        y
      );
    } else {
      watermarkBitmap =
        await createImageBitmap(
          watermarkFile
        );

      const targetWidth =
        canvas.width *
        (
          safeSizePercent /
          100
        );

      const scale =
        targetWidth /
        watermarkBitmap.width;

      const targetHeight =
        watermarkBitmap.height *
        scale;

      const [x, y] =
        getPosition({
          position,

          canvasWidth:
            canvas.width,

          canvasHeight:
            canvas.height,

          itemWidth:
            targetWidth,

          itemHeight:
            targetHeight,

          margin,
        });

      context.drawImage(
        watermarkBitmap,
        x,
        y,
        targetWidth,
        targetHeight
      );
    }

    context.restore();

    const blob =
      await canvasToBlob(
        canvas,
        file.type
      );

    return {
      blob,

      originalSize:
        file.size,

      outputSize:
        blob.size,

      width:
        bitmap.width,

      height:
        bitmap.height,

      type,
      position,

      opacity:
        safeOpacity,

      sizePercent:
        safeSizePercent,

      mimeType:
        blob.type,
    };
  } finally {
    bitmap.close();

    watermarkBitmap?.close();
  }
}