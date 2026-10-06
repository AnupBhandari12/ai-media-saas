"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { rotateFlipImage } from "@/lib/tools/image/rotateFlipImage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createOutputFilename(file, mimeType) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionMap[mimeType] || "jpg";

  return `${baseName}-transformed.${extension}`;
}

export default function RotateFlipTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [error, setError] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [rotation, setRotation] = useState(0);

  const [flipHorizontal, setFlipHorizontal] = useState(false);

  const [flipVertical, setFlipVertical] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [resultUrl, setResultUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  const hasTransform = rotation !== 0 || flipHorizontal || flipVertical;

  const swapsDimensions = rotation === 90 || rotation === 270;

  const outputWidth = swapsDimensions ? dimensions.height : dimensions.width;

  const outputHeight = swapsDimensions ? dimensions.width : dimensions.height;

  function clearResult() {
    setError("");
    setResultUrl("");
    onResultChange?.(null);
  }

  async function handleFilesSelected(files) {
    const selectedFile = files[0];

    if (!selectedFile) {
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Image must be 10 MB or smaller.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);

      setFile(selectedFile);

      setPreviewUrl(objectUrl);

      setDimensions({
        width: bitmap.width,
        height: bitmap.height,
      });

      setRotation(0);
      setFlipHorizontal(false);
      setFlipVertical(false);

      setError("");
      setResultUrl("");

      onResultChange?.(null);

      bitmap.close();
    } catch {
      setError("The selected image could not be read.");
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setPreviewUrl("");

    setDimensions({
      width: 0,
      height: 0,
    });

    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);

    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  function rotateLeft() {
    setRotation((current) => (current + 270) % 360);

    clearResult();
  }

  function rotateRight() {
    setRotation((current) => (current + 90) % 360);

    clearResult();
  }

  function toggleHorizontal() {
    setFlipHorizontal((current) => !current);

    clearResult();
  }

  function toggleVertical() {
    setFlipVertical((current) => !current);

    clearResult();
  }

  function resetTransform() {
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);

    clearResult();
  }

  async function handleProcess() {
    if (!file || isProcessing || !hasTransform) {
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const transformedResult = await rotateFlipImage(file, {
        rotation,
        flipHorizontal,
        flipVertical,
      });

      const objectUrl = URL.createObjectURL(transformedResult.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result: transformedResult,

        resultUrl: objectUrl,

        filename: createOutputFilename(file, transformedResult.mimeType),
      });
    } catch (transformError) {
      setError(
        transformError instanceof Error
          ? transformError.message
          : "Something went wrong while transforming the image.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Drop your image here"
          description="JPG, PNG, or WebP up to 10 MB."
        />

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="relative min-h-64 overflow-hidden bg-slate-50">
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
          <p className="truncate font-semibold text-foreground">{file.name}</p>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>{formatBytes(file.size)}</span>

            <span>
              {dimensions.width} × {dimensions.height}px
            </span>
          </div>

          <button
            type="button"
            onClick={handleRemoveFile}
            className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            Choose another image
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Transform image</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Rotate in 90-degree steps or flip the image horizontally and
          vertically.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={rotateLeft}
            className="min-h-11 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            ↺ Rotate Left 90°
          </button>

          <button
            type="button"
            onClick={rotateRight}
            className="min-h-11 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            ↻ Rotate Right 90°
          </button>

          <button
            type="button"
            onClick={toggleHorizontal}
            className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              flipHorizontal
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-foreground hover:border-primary/40"
            }`}
          >
            ↔ Flip Horizontal
          </button>

          <button
            type="button"
            onClick={toggleVertical}
            className={`min-h-11 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              flipVertical
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-foreground hover:border-primary/40"
            }`}
          >
            ↕ Flip Vertical
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Current transform
          </p>

          <p className="mt-1 font-semibold text-foreground">
            Rotation: {rotation}°
          </p>

          <p className="mt-1 text-sm text-muted">
            Horizontal flip: {flipHorizontal ? "Yes" : "No"}
          </p>

          <p className="text-sm text-muted">
            Vertical flip: {flipVertical ? "Yes" : "No"}
          </p>

          <p className="mt-3 text-sm font-semibold text-foreground">
            Output: {outputWidth} × {outputHeight}px
          </p>
        </div>

        <button
          type="button"
          onClick={resetTransform}
          disabled={!hasTransform}
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset Transform
        </button>
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={isProcessing || !hasTransform}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? "Processing..." : "Apply Transform"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Transforming your image locally on this device..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isProcessing && resultUrl && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message="Image transformed successfully."
          />
        </div>
      )}
    </div>
  );
}
