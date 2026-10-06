"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { resizeImageByPixels } from "@/lib/tools/image/resizeImageByPixels";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PERCENTAGE_PRESETS = [25, 50, 75, 100];

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createOutputFilename(file, mimeType, percentage) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionMap[mimeType] || "jpg";

  return `${baseName}-${percentage}percent.${extension}`;
}

export default function ResizePercentageTool({ onResultChange }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [percentage, setPercentage] = useState(50);
  const [isCustom, setIsCustom] = useState(false);
  const [customPercentage, setCustomPercentage] = useState("");

  const [isResizing, setIsResizing] = useState(false);
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

  const hasValidPercentage =
    !isCustom ||
    (customPercentage !== "" &&
      Number.isFinite(Number(customPercentage)) &&
      Number(customPercentage) >= 1 &&
      Number(customPercentage) <= 500);

  const outputWidth =
    dimensions.width > 0 && hasValidPercentage
      ? Math.max(1, Math.round(dimensions.width * (percentage / 100)))
      : 0;

  const outputHeight =
    dimensions.height > 0 && hasValidPercentage
      ? Math.max(1, Math.round(dimensions.height * (percentage / 100)))
      : 0;

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

      setError("");
      setFile(selectedFile);
      setPreviewUrl(objectUrl);

      setDimensions({
        width: bitmap.width,
        height: bitmap.height,
      });

      setPercentage(50);
      setIsCustom(false);
      setCustomPercentage("");

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
    setError("");

    setDimensions({
      width: 0,
      height: 0,
    });

    setPercentage(50);
    setIsCustom(false);
    setCustomPercentage("");

    setResultUrl("");
    onResultChange?.(null);
  }

  function handlePreset(value) {
    setPercentage(value);
    setIsCustom(false);
    setCustomPercentage("");
    clearResult();
  }

  function handleCustomChange(event) {
    const rawValue = event.target.value;

    setIsCustom(true);
    setCustomPercentage(rawValue);
    clearResult();

    const value = Number(rawValue);

    if (
      rawValue !== "" &&
      Number.isFinite(value) &&
      value >= 1 &&
      value <= 500
    ) {
      setPercentage(value);
    }
  }

  async function handleResize() {
    if (
      !file ||
      isResizing ||
      !hasValidPercentage ||
      !outputWidth ||
      !outputHeight
    ) {
      return;
    }

    try {
      setIsResizing(true);
      setError("");
      setResultUrl("");
      onResultChange?.(null);

      const resizedResult = await resizeImageByPixels(
        file,
        outputWidth,
        outputHeight,
      );

      const objectUrl = URL.createObjectURL(resizedResult.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result: resizedResult,
        resultUrl: objectUrl,
        percentage,
        filename: createOutputFilename(
          file,
          resizedResult.mimeType,
          percentage,
        ),
      });
    } catch (resizeError) {
      setError(
        resizeError instanceof Error
          ? resizeError.message
          : "Something went wrong while resizing the image.",
      );
    } finally {
      setIsResizing(false);
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
        <p className="font-semibold text-foreground">Resize percentage</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Scale the image while keeping its original aspect ratio.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PERCENTAGE_PRESETS.map((value) => {
            const isSelected = !isCustom && percentage === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => handlePreset(value)}
                className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-foreground hover:border-primary/40"
                }`}
              >
                {value}%
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <label
            htmlFor="custom-resize-percentage"
            className="text-sm font-semibold text-foreground"
          >
            Custom percentage
          </label>

          <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-border bg-surface">
            <input
              id="custom-resize-percentage"
              type="number"
              min="1"
              max="500"
              step="1"
              value={customPercentage}
              placeholder="Enter percentage"
              onChange={handleCustomChange}
              className="min-h-11 w-full bg-transparent px-4 text-sm text-foreground outline-none"
            />

            <span className="border-l border-border px-4 text-sm font-semibold text-muted">
              %
            </span>
          </div>

          <p className="mt-2 text-xs text-muted">Allowed range: 1% to 500%.</p>
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Output
          </p>

          <p className="mt-1 text-lg font-semibold text-foreground">
            {hasValidPercentage
              ? `${percentage}% · ${outputWidth} × ${outputHeight}px`
              : "Enter a valid percentage"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleResize}
        disabled={
          isResizing || !hasValidPercentage || !outputWidth || !outputHeight
        }
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isResizing ? "Resizing..." : "Resize Image"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally on your device.
      </p>

      {isResizing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Resizing your image locally on this device..."
          />
        </div>
      )}

      {!isResizing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isResizing && resultUrl && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message="Image resized successfully."
          />
        </div>
      )}
    </div>
  );
}
