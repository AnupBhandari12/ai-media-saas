"use client";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import {
  batchProcessImages,
  OUTPUT_TYPES,
} from "@/lib/tools/image/batchProcessImages";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

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

export default function BatchImageTool({ onResultChange }) {
  const [files, setFiles] = useState([]);

  const [scalePercent, setScalePercent] = useState(100);

  const [outputType, setOutputType] = useState(OUTPUT_TYPES.ORIGINAL);

  const [qualityPercent, setQualityPercent] = useState(85);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrls, setResultUrls] = useState([]);

  const [zipUrl, setZipUrl] = useState("");

  useEffect(() => {
    return () => {
      for (const url of resultUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [resultUrls]);

  useEffect(() => {
    return () => {
      if (zipUrl) {
        URL.revokeObjectURL(zipUrl);
      }
    };
  }, [zipUrl]);

  function clearResult() {
    setError("");
    setResultUrls([]);
    setZipUrl("");

    onResultChange?.(null);
  }

  function handleFilesSelected(selectedFiles) {
    if (selectedFiles.length > 10) {
      setError("You can process up to 10 images at once.");
      return;
    }

    const invalid = selectedFiles.find(
      (file) => !ALLOWED_TYPES.includes(file.type),
    );

    if (invalid) {
      setError(`"${invalid.name}" is not JPG, PNG, or WebP.`);
      return;
    }

    const oversized = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (oversized) {
      setError(`"${oversized.name}" is larger than 10 MB.`);
      return;
    }

    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Combined file size must be 50 MB or smaller.");
      return;
    }

    setFiles(selectedFiles);
    clearResult();
  }

  function removeFile(index) {
    setFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );

    clearResult();
  }

  async function handleProcess() {
    if (files.length === 0 || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setResultUrls([]);
      setZipUrl("");

      onResultChange?.(null);

      const output = await batchProcessImages(files, {
        scalePercent,
        outputType,
        qualityPercent,
      });

      const urls = output.results.map((result) =>
        URL.createObjectURL(result.blob),
      );

      const generatedZipUrl = URL.createObjectURL(output.zipBlob);

      setResultUrls(urls);
      setZipUrl(generatedZipUrl);

      onResultChange?.({
        ...output,

        zipUrl: generatedZipUrl,

        downloads: output.results.map((result, index) => ({
          name: result.filename,

          filename: result.filename,

          url: urls[index],
        })),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Something went wrong while processing the batch.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      {files.length === 0 ? (
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          multiple
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose up to 10 images"
          description="JPG, PNG, or WebP. Maximum 10 MB each and 50 MB combined."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Selected images</p>

              <p className="mt-1 text-sm text-muted">
                {files.length} file
                {files.length === 1 ? "" : "s"} ready.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setFiles([]);
                clearResult();
              }}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {formatBytes(file.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="shrink-0 text-sm font-semibold text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <FileDropzone
              accept="image/jpeg,image/png,image/webp"
              multiple
              maxSizeBytes={MAX_FILE_SIZE}
              onFilesSelected={handleFilesSelected}
              title="Replace selected images"
              description="Choose a new batch of up to 10 images."
            />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Batch settings</p>

        <div className="mt-5">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-semibold text-foreground">Resize scale</span>

            <span className="font-semibold text-primary">{scalePercent}%</span>
          </div>

          <input
            type="range"
            min="10"
            max="200"
            step="5"
            value={scalePercent}
            onChange={(event) => {
              setScalePercent(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-foreground">Output format</p>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [OUTPUT_TYPES.ORIGINAL, "Keep"],
              [OUTPUT_TYPES.JPEG, "JPG"],
              [OUTPUT_TYPES.PNG, "PNG"],
              [OUTPUT_TYPES.WEBP, "WebP"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setOutputType(value);

                  clearResult();
                }}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                  outputType === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {outputType !== OUTPUT_TYPES.PNG && (
          <div className="mt-6">
            <div className="flex justify-between gap-4 text-sm">
              <span className="font-semibold text-foreground">Quality</span>

              <span className="font-semibold text-primary">
                {qualityPercent}%
              </span>
            </div>

            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={qualityPercent}
              onChange={(event) => {
                setQualityPercent(Number(event.target.value));

                clearResult();
              }}
              className="mt-3 w-full accent-indigo-600"
            />
          </div>
        )}

        <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
          AI Media processes at most two images simultaneously to reduce browser
          memory pressure.
        </div>
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={files.length === 0 || isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Processing batch..."
          : `Process ${files.length || ""} Image${files.length === 1 ? "" : "s"}`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Processing your images and preparing the ZIP file..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isProcessing && resultUrls.length > 0 && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message={`${resultUrls.length} images processed successfully.`}
          />
        </div>
      )}
    </div>
  );
}
