"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import FileDropzone from "@/components/tools/FileDropzone";
import { compressToTargetSize } from "@/lib/tools/image/compressToTargetSize";
import ProgressPanel from "@/components/tools/ProgressPanel";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const TARGET_PRESETS = [
  { label: "100 KB", value: 100 },
  { label: "200 KB", value: 200 },
  { label: "500 KB", value: 500 },
  { label: "1 MB", value: 1024 },
];

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createOutputFilename(file, mimeType, targetKb) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const extension = extensionMap[mimeType] || "jpg";

  return `${baseName}-target-${targetKb}kb.${extension}`;
}

export default function CompressTargetTool({ onResultChange }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const [targetKb, setTargetKb] = useState(200);
  const [isCustom, setIsCustom] = useState(false);

  const [customTarget, setCustomTarget] = useState("");

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

      const compressedResult = await compressToTargetSize(file, targetKb);

      const objectUrl = URL.createObjectURL(compressedResult.blob);

      setResultUrl(objectUrl);
      onResultChange?.({
        result: compressedResult,
        resultUrl: objectUrl,
        filename: createOutputFilename(
          file,
          compressedResult.mimeType,
          targetKb,
        ),
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

  function handlePreset(value) {
    setTargetKb(value);
    setIsCustom(false);
    setCustomTarget("");

    setResultUrl("");
    onResultChange?.(null);
  }

  function handleCustomChange(event) {
    const rawValue = event.target.value;

    setIsCustom(true);
    setCustomTarget(rawValue);

    setResultUrl("");
    onResultChange?.(null);

    const value = Number(rawValue);

    if (rawValue !== "" && Number.isFinite(value) && value >= 1) {
      setTargetKb(value);
    }
  }

  const hasValidTarget =
    !isCustom ||
    (customTarget !== "" &&
      Number.isFinite(Number(customTarget)) &&
      Number(customTarget) >= 1);

  return (
    <div>
      {/* File upload / original preview */}
      {!file ? (
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
      ) : (
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

            <p className="mt-1 text-sm text-muted">{formatBytes(file.size)}</p>

            <button
              type="button"
              onClick={handleRemoveFile}
              className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40"
            >
              Choose another image
            </button>
          </div>
        </div>
      )}

      {/* Target size */}
      <div className="mt-6">
        <p className="font-semibold text-foreground">Target file size</p>

        <p className="mt-2 text-sm leading-6 text-muted">
          Choose the maximum size you want for the final image.
        </p>
      </div>

      {/* Presets */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TARGET_PRESETS.map((preset) => {
          const isSelected = !isCustom && targetKb === preset.value;

          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePreset(preset.value)}
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-foreground hover:border-primary/40"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom target */}
      <div className="mt-5">
        <label
          htmlFor="custom-target-size"
          className="text-sm font-semibold text-foreground"
        >
          Custom size
        </label>

        <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-border bg-background">
          <input
            id="custom-target-size"
            type="number"
            min="1"
            step="1"
            value={customTarget}
            placeholder="Enter target size"
            onChange={handleCustomChange}
            className="min-h-11 w-full bg-transparent px-4 text-sm text-foreground outline-none"
          />

          <span className="border-l border-border px-4 text-sm font-semibold text-muted">
            KB
          </span>
        </div>
      </div>

      {/* Selected target */}
      <div className="mt-5 rounded-xl border border-border bg-background p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Selected target
        </p>

        <p className="mt-1 text-lg font-semibold text-foreground">
          {hasValidTarget
            ? targetKb >= 1024
              ? `${(targetKb / 1024).toFixed(2)} MB`
              : `${targetKb} KB`
            : "Enter a valid target"}
        </p>
      </div>

      {/* Compress button */}
      <button
        type="button"
        onClick={handleCompress}
        disabled={!file || isCompressing || !hasValidTarget}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isCompressing ? "Compressing..." : "Compress to Target"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally on your device.
      </p>

      {/* Processing */}
      {isCompressing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Searching for the best quality and dimensions for your target..."
          />
        </div>
      )}

      {/* Error */}
      {!isCompressing && error && file && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}
    </div>
  );
}
