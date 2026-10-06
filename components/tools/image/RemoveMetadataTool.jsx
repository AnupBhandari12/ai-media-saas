"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { readImageMetadata } from "@/lib/tools/image/readImageMetadata";
import { removeImageMetadata } from "@/lib/tools/image/removeImageMetadata";

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

  return `${baseName}-clean.${extensionMap[mimeType] || "jpg"}`;
}

export default function RemoveMetadataTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [inputMetadata, setInputMetadata] = useState(null);

  const [error, setError] = useState("");

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
      const metadata = await readImageMetadata(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);

      setFile(selectedFile);

      setPreviewUrl(objectUrl);

      setInputMetadata(metadata);

      setError("");
      setResultUrl("");

      onResultChange?.(null);
    } catch (metadataError) {
      setError(
        metadataError instanceof Error
          ? metadataError.message
          : "The selected image could not be read.",
      );
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setPreviewUrl("");

    setInputMetadata(null);

    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  async function handleClean() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const result = await removeImageMetadata(file);

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        originalMetadata: inputMetadata,

        filename: createOutputFilename(file, result.mimeType),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Something went wrong while removing metadata.",
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
          title="Choose an image"
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
          <Image
            src={previewUrl}
            alt={file.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-4"
          />
        </div>

        <div className="border-t border-border p-4">
          <p className="truncate font-semibold text-foreground">{file.name}</p>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
            <span>{formatBytes(file.size)}</span>

            {inputMetadata && (
              <span>
                {inputMetadata.width} × {inputMetadata.height}
                px
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleRemoveFile}
            className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
          >
            Choose another image
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Privacy check</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">EXIF detected</p>

            <p className="mt-1 font-semibold text-foreground">
              {inputMetadata?.detailedExifSupported
                ? inputMetadata.hasExif
                  ? "Yes"
                  : "No"
                : "Not fully inspected"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">GPS detected</p>

            <p className="mt-1 font-semibold text-foreground">
              {inputMetadata?.detailedExifSupported
                ? inputMetadata.hasGps
                  ? "Yes"
                  : "No"
                : "Not fully inspected"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-muted">
          AI Media removes common embedded metadata by decoding the visible
          pixels and creating a new image locally in your browser.
        </p>
      </div>

      <button
        type="button"
        onClick={handleClean}
        disabled={isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Removing metadata..." : "Remove Metadata"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating a clean image locally..."
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
            message="Metadata-clean image created successfully."
          />
        </div>
      )}
    </div>
  );
}
