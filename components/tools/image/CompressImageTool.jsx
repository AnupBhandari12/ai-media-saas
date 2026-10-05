"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import FileDropzone from "@/components/tools/FileDropzone";
import { compressImage } from "@/lib/tools/image/compressImage";
import ProgressPanel from "@/components/tools/ProgressPanel";

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

  return `${baseName}-compressed.${extension}`;
}

export default function CompressImageTool({ onResultChange }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [quality, setQuality] = useState(80);
  const [isCompressing, setIsCompressing] = useState(false);
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

  function handleFilesSelected(files) {
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

    const objectUrl = URL.createObjectURL(selectedFile);

    setError("");
    setFile(selectedFile);
    setPreviewUrl(objectUrl);
    setResultUrl("");
    onResultChange?.(null);
  }

  function handleRemoveFile() {
    setFile(null);
    setPreviewUrl("");
    setError("");
    setQuality(80);
    setResultUrl("");
    onResultChange?.(null);
  }

  async function handleCompress() {
    if (!file || isCompressing) {
      return;
    }

    try {
      setIsCompressing(true);
      setError("");
      setResultUrl("");
      onResultChange?.(null);

      const compressedResult = await compressImage(file, quality);

      const objectUrl = URL.createObjectURL(compressedResult.blob);

      setResultUrl(objectUrl);
      onResultChange?.({
        result: compressedResult,
        resultUrl: objectUrl,
        filename: createOutputFilename(file, compressedResult.mimeType),
      });
    } catch (compressionError) {
      setError(
        compressionError instanceof Error
          ? compressionError.message
          : "Something went wrong while compressing the image.",
      );
    } finally {
      setIsCompressing(false);
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

        {isCompressing && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Compressing your image locally on this device..."
            />
          </div>
        )}

        {!isCompressing && error && (
          <div className="mt-4">
            <ProgressPanel status="ERROR" message={error} />
          </div>
        )}

        {!isCompressing && resultUrl && (
          <div className="mt-4">
            <ProgressPanel
              status="SUCCESS"
              message="Compression finished successfully."
            />
          </div>
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
            <span>{file.type}</span>
            <span>{formatBytes(file.size)}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Compression quality</p>

            <p className="mt-1 text-sm text-muted">
              Lower quality usually creates a smaller file.
            </p>
          </div>

          <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {quality}%
          </span>
        </div>

        <input
          type="range"
          min="40"
          max="95"
          step="5"
          value={quality}
          onChange={(event) => {
            setQuality(Number(event.target.value));
            setResultUrl("");
            onResultChange?.(null);
          }}
          className="mt-5 w-full accent-indigo-600"
          aria-label="Compression quality"
        />

        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>Smaller file</span>
          <span>Higher quality</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCompress}
        disabled={isCompressing}
        className="mt-4 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCompressing ? "Compressing..." : "Compress Image"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Compression processing will run locally on your device.
      </p>
      {error && (
        <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleRemoveFile}
        className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40"
      >
        Choose another image
      </button>
    </div>
  );
}
