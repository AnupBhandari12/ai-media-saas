"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { resizeImageByPixels } from "@/lib/tools/image/resizeImageByPixels";

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

function createOutputFilename(file, mimeType, width, height) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionMap[mimeType] || "jpg";

  return `${baseName}-${width}x${height}.${extension}`;
}

export default function ResizePixelsTool({ onResultChange }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

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

      setResizeWidth(bitmap.width);
      setResizeHeight(bitmap.height);
      setLockAspectRatio(true);

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

    setResizeWidth("");
    setResizeHeight("");
    setLockAspectRatio(true);

    setResultUrl("");
    onResultChange?.(null);
  }

  function clearResult() {
    setError("");
    setResultUrl("");
    onResultChange?.(null);
  }

  function handleWidthChange(event) {
    const rawValue = event.target.value;

    clearResult();

    if (rawValue === "") {
      setResizeWidth("");
      return;
    }

    const width = Math.round(Number(rawValue));

    if (!Number.isFinite(width) || width < 1) {
      return;
    }

    setResizeWidth(width);

    if (lockAspectRatio && dimensions.width > 0 && dimensions.height > 0) {
      const aspectRatio = dimensions.width / dimensions.height;

      setResizeHeight(Math.max(1, Math.round(width / aspectRatio)));
    }
  }

  function handleHeightChange(event) {
    const rawValue = event.target.value;

    clearResult();

    if (rawValue === "") {
      setResizeHeight("");
      return;
    }

    const height = Math.round(Number(rawValue));

    if (!Number.isFinite(height) || height < 1) {
      return;
    }

    setResizeHeight(height);

    if (lockAspectRatio && dimensions.width > 0 && dimensions.height > 0) {
      const aspectRatio = dimensions.width / dimensions.height;

      setResizeWidth(Math.max(1, Math.round(height * aspectRatio)));
    }
  }

  function handleAspectRatioToggle() {
    setLockAspectRatio((current) => !current);
    clearResult();
  }

  async function handleResize() {
    if (!file || isResizing || !resizeWidth || !resizeHeight) {
      return;
    }

    try {
      setIsResizing(true);
      setError("");
      setResultUrl("");
      onResultChange?.(null);

      const resizedResult = await resizeImageByPixels(
        file,
        resizeWidth,
        resizeHeight,
      );

      const objectUrl = URL.createObjectURL(resizedResult.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result: resizedResult,
        resultUrl: objectUrl,
        filename: createOutputFilename(
          file,
          resizedResult.mimeType,
          resizedResult.width,
          resizedResult.height,
        ),
        aspectRatioLocked: lockAspectRatio,
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Resize dimensions</p>

            <p className="mt-1 text-sm leading-6 text-muted">
              Enter the exact pixel dimensions for the resized image.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAspectRatioToggle}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
              lockAspectRatio
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {lockAspectRatio ? <Lock size={16} /> : <Unlock size={16} />}

            {lockAspectRatio ? "Locked" : "Unlocked"}
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="resize-width"
              className="text-sm font-semibold text-foreground"
            >
              Width
            </label>

            <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-border bg-surface">
              <input
                id="resize-width"
                type="number"
                min="1"
                value={resizeWidth}
                onChange={handleWidthChange}
                className="min-h-11 w-full bg-transparent px-4 text-sm text-foreground outline-none"
              />

              <span className="border-l border-border px-4 text-sm font-semibold text-muted">
                px
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="resize-height"
              className="text-sm font-semibold text-foreground"
            >
              Height
            </label>

            <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-border bg-surface">
              <input
                id="resize-height"
                type="number"
                min="1"
                value={resizeHeight}
                onChange={handleHeightChange}
                className="min-h-11 w-full bg-transparent px-4 text-sm text-foreground outline-none"
              />

              <span className="border-l border-border px-4 text-sm font-semibold text-muted">
                px
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Output dimensions
          </p>

          <p className="mt-1 text-lg font-semibold text-foreground">
            {resizeWidth || "—"} × {resizeHeight || "—"} px
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleResize}
        disabled={isResizing || !resizeWidth || !resizeHeight}
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
