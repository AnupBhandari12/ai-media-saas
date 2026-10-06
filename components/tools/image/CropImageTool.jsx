"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
} from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { cropImage } from "@/lib/tools/image/cropImage";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const CROP_PRESETS = [
  {
    label: "Free",
    ratio: null,
  },
  {
    label: "1:1",
    ratio: 1,
  },
  {
    label: "4:3",
    ratio: 4 / 3,
  },
  {
    label: "3:4",
    ratio: 3 / 4,
  },
  {
    label: "16:9",
    ratio: 16 / 9,
  },
];

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function createOutputFilename(
  file,
  mimeType
) {
  const lastDotIndex =
    file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0
      ? file.name.slice(
          0,
          lastDotIndex
        )
      : file.name;

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension =
    extensionMap[mimeType] || "jpg";

  return `${baseName}-cropped.${extension}`;
}

function createCenteredCrop(
  imageWidth,
  imageHeight,
  ratio
) {
  if (!ratio) {
    return {
      x: 0,
      y: 0,
      width: imageWidth,
      height: imageHeight,
    };
  }

  const originalRatio =
    imageWidth / imageHeight;

  let width;
  let height;

  if (originalRatio > ratio) {
    height = imageHeight;
    width = Math.round(
      height * ratio
    );
  } else {
    width = imageWidth;
    height = Math.round(
      width / ratio
    );
  }

  return {
    x: Math.max(
      0,
      Math.round(
        (imageWidth - width) / 2
      )
    ),

    y: Math.max(
      0,
      Math.round(
        (imageHeight - height) / 2
      )
    ),

    width,
    height,
  };
}

export default function CropImageTool({
  onResultChange,
}) {
  const [file, setFile] =
    useState(null);

  const [
    previewUrl,
    setPreviewUrl,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [
    dimensions,
    setDimensions,
  ] = useState({
    width: 0,
    height: 0,
  });

  const [
    selectedPreset,
    setSelectedPreset,
  ] = useState("Free");

  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
    width: "",
    height: "",
  });

  const [
    isCropping,
    setIsCropping,
  ] = useState(false);

  const [
    resultUrl,
    setResultUrl,
  ] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }
    };
  }, [resultUrl]);

  const cropX = Number(crop.x);
  const cropY = Number(crop.y);
  const cropWidth =
    Number(crop.width);
  const cropHeight =
    Number(crop.height);

  const hasValidCrop =
    crop.x !== "" &&
    crop.y !== "" &&
    crop.width !== "" &&
    crop.height !== "" &&
    Number.isFinite(cropX) &&
    Number.isFinite(cropY) &&
    Number.isFinite(cropWidth) &&
    Number.isFinite(cropHeight) &&
    cropX >= 0 &&
    cropY >= 0 &&
    cropWidth >= 1 &&
    cropHeight >= 1 &&
    cropX + cropWidth <=
      dimensions.width &&
    cropY + cropHeight <=
      dimensions.height;

  function clearResult() {
    setError("");
    setResultUrl("");
    onResultChange?.(null);
  }

  async function handleFilesSelected(
    files
  ) {
    const selectedFile = files[0];

    if (!selectedFile) {
      return;
    }

    if (
      !ALLOWED_TYPES.includes(
        selectedFile.type
      )
    ) {
      setError(
        "Please choose a JPG, PNG, or WebP image."
      );
      return;
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setError(
        "Image must be 10 MB or smaller."
      );
      return;
    }

    try {
      const bitmap =
        await createImageBitmap(
          selectedFile
        );

      const objectUrl =
        URL.createObjectURL(
          selectedFile
        );

      setFile(selectedFile);
      setPreviewUrl(objectUrl);

      setDimensions({
        width: bitmap.width,
        height: bitmap.height,
      });

      setCrop({
        x: 0,
        y: 0,
        width: bitmap.width,
        height: bitmap.height,
      });

      setSelectedPreset("Free");

      setError("");
      setResultUrl("");
      onResultChange?.(null);

      bitmap.close();
    } catch {
      setError(
        "The selected image could not be read."
      );
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setPreviewUrl("");

    setDimensions({
      width: 0,
      height: 0,
    });

    setCrop({
      x: 0,
      y: 0,
      width: "",
      height: "",
    });

    setSelectedPreset("Free");

    setError("");
    setResultUrl("");
    onResultChange?.(null);
  }

  function handlePreset(
    preset
  ) {
    const nextCrop =
      createCenteredCrop(
        dimensions.width,
        dimensions.height,
        preset.ratio
      );

    setSelectedPreset(
      preset.label
    );

    setCrop(nextCrop);

    clearResult();
  }

  function handleCropField(
    field,
    value
  ) {
    setCrop((current) => ({
      ...current,
      [field]: value,
    }));

    setSelectedPreset("Free");
    clearResult();
  }

  async function handleCrop() {
    if (
      !file ||
      isCropping ||
      !hasValidCrop
    ) {
      return;
    }

    try {
      setIsCropping(true);
      setError("");
      setResultUrl("");
      onResultChange?.(null);

      const croppedResult =
        await cropImage(
          file,
          crop
        );

      const objectUrl =
        URL.createObjectURL(
          croppedResult.blob
        );

      setResultUrl(objectUrl);

      onResultChange?.({
        result: croppedResult,
        resultUrl: objectUrl,

        filename:
          createOutputFilename(
            file,
            croppedResult.mimeType
          ),

        preset: selectedPreset,
      });
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Something went wrong while cropping the image."
      );
    } finally {
      setIsCropping(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={
            MAX_FILE_SIZE
          }
          onFilesSelected={
            handleFilesSelected
          }
          title="Drop your image here"
          description="JPG, PNG, or WebP up to 10 MB."
        />

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="relative min-h-64 bg-slate-50">
          {previewUrl && (
            <Image
              src={previewUrl}
              alt={file.name}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain p-4"
            />
          )}
        </div>

        <div className="border-t border-border p-4">
          <p className="truncate font-semibold text-foreground">
            {file.name}
          </p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>
              {formatBytes(file.size)}
            </span>

            <span>
              {dimensions.width} ×{" "}
              {dimensions.height}px
            </span>
          </div>

          <button
            type="button"
            onClick={
              handleRemoveFile
            }
            className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            Choose another image
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">
          Crop preset
        </p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Start with a common
          aspect ratio or enter a
          custom crop area.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {CROP_PRESETS.map(
            (preset) => {
              const isSelected =
                selectedPreset ===
                preset.label;

              return (
                <button
                  key={
                    preset.label
                  }
                  type="button"
                  onClick={() =>
                    handlePreset(
                      preset
                    )
                  }
                  className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-foreground hover:border-primary/40"
                  }`}
                >
                  {preset.label}
                </button>
              );
            }
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="crop-x"
              className="text-sm font-semibold text-foreground"
            >
              Start X
            </label>

            <div className="mt-2 flex overflow-hidden rounded-xl border border-border bg-surface">
              <input
                id="crop-x"
                type="number"
                min="0"
                value={crop.x}
                onChange={(
                  event
                ) =>
                  handleCropField(
                    "x",
                    event.target
                      .value
                  )
                }
                className="min-h-11 w-full bg-transparent px-4 text-sm outline-none"
              />

              <span className="border-l border-border px-4 py-3 text-sm text-muted">
                px
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="crop-y"
              className="text-sm font-semibold text-foreground"
            >
              Start Y
            </label>

            <div className="mt-2 flex overflow-hidden rounded-xl border border-border bg-surface">
              <input
                id="crop-y"
                type="number"
                min="0"
                value={crop.y}
                onChange={(
                  event
                ) =>
                  handleCropField(
                    "y",
                    event.target
                      .value
                  )
                }
                className="min-h-11 w-full bg-transparent px-4 text-sm outline-none"
              />

              <span className="border-l border-border px-4 py-3 text-sm text-muted">
                px
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="crop-width"
              className="text-sm font-semibold text-foreground"
            >
              Crop width
            </label>

            <div className="mt-2 flex overflow-hidden rounded-xl border border-border bg-surface">
              <input
                id="crop-width"
                type="number"
                min="1"
                value={
                  crop.width
                }
                onChange={(
                  event
                ) =>
                  handleCropField(
                    "width",
                    event.target
                      .value
                  )
                }
                className="min-h-11 w-full bg-transparent px-4 text-sm outline-none"
              />

              <span className="border-l border-border px-4 py-3 text-sm text-muted">
                px
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="crop-height"
              className="text-sm font-semibold text-foreground"
            >
              Crop height
            </label>

            <div className="mt-2 flex overflow-hidden rounded-xl border border-border bg-surface">
              <input
                id="crop-height"
                type="number"
                min="1"
                value={
                  crop.height
                }
                onChange={(
                  event
                ) =>
                  handleCropField(
                    "height",
                    event.target
                      .value
                  )
                }
                className="min-h-11 w-full bg-transparent px-4 text-sm outline-none"
              />

              <span className="border-l border-border px-4 py-3 text-sm text-muted">
                px
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Crop output
          </p>

          <p className="mt-1 text-lg font-semibold text-foreground">
            {hasValidCrop
              ? `${cropWidth} × ${cropHeight}px`
              : "Invalid crop area"}
          </p>

          <p className="mt-1 text-xs text-muted">
            Position: X{" "}
            {crop.x || 0}, Y{" "}
            {crop.y || 0}
          </p>
        </div>

        {!hasValidCrop && (
          <p className="mt-3 text-sm font-medium text-red-600">
            Crop area must
            remain inside the
            original{" "}
            {dimensions.width} ×{" "}
            {dimensions.height}px
            image.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleCrop}
        disabled={
          isCropping ||
          !hasValidCrop
        }
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCropping
          ? "Cropping..."
          : "Crop Image"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally
        on your device.
      </p>

      {isCropping && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Cropping your image locally on this device..."
          />
        </div>
      )}

      {!isCropping &&
        error && (
          <div className="mt-4">
            <ProgressPanel
              status="ERROR"
              message={error}
            />
          </div>
        )}

      {!isCropping &&
        resultUrl && (
          <div className="mt-4">
            <ProgressPanel
              status="SUCCESS"
              message="Image cropped successfully."
            />
          </div>
        )}
    </div>
  );
}