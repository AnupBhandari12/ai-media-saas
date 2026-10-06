"use client";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { packageFilesAsZip } from "@/lib/tools/creator/packageFilesAsZip";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ZipPackagerTool({ onResultChange }) {
  const [files, setFiles] = useState([]);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [zipUrl, setZipUrl] = useState("");

  useEffect(() => {
    return () => {
      if (zipUrl) {
        URL.revokeObjectURL(zipUrl);
      }
    };
  }, [zipUrl]);

  function clearResult() {
    setError("");
    setZipUrl("");

    onResultChange?.(null);
  }

  function handleFilesSelected(selectedFiles) {
    if (selectedFiles.length > 20) {
      setError("Choose up to 20 files.");

      return;
    }

    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > 75 * 1024 * 1024) {
      setError("Combined file size must be 75 MB or smaller.");

      return;
    }

    setFiles(selectedFiles);

    clearResult();
  }

  async function handleCreateZip() {
    if (files.length === 0 || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await packageFilesAsZip(files);

      const objectUrl = URL.createObjectURL(result.zipBlob);

      setZipUrl(objectUrl);

      onResultChange?.({
        ...result,

        zipUrl: objectUrl,

        filename: "ai-media-files.zip",
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "ZIP creation failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <FileDropzone
        multiple
        maxSizeBytes={MAX_FILE_SIZE}
        onFilesSelected={handleFilesSelected}
        title="Choose files to package"
        description="Up to 20 files and 75 MB combined."
      />

      {files.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Selected files</p>

          <div className="mt-4 space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <p className="min-w-0 truncate text-sm font-semibold">
                  {file.name}
                </p>

                <span className="shrink-0 text-xs text-muted">
                  {formatBytes(file.size)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCreateZip}
        disabled={files.length === 0 || isProcessing}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Creating ZIP..."
          : `Create ZIP (${files.length} files)`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Packaging files locally..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isProcessing && zipUrl && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message="ZIP package created successfully."
          />
        </div>
      )}
    </div>
  );
}
