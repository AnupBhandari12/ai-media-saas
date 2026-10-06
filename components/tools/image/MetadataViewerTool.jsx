"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { readImageMetadata } from "@/lib/tools/image/readImageMetadata";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function MetadataViewerTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [isReading, setIsReading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      setIsReading(true);
      setError("");

      onResultChange?.(null);

      const metadata = await readImageMetadata(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);

      setFile(selectedFile);
      setPreviewUrl(objectUrl);

      onResultChange?.({
        metadata,
        previewUrl: objectUrl,
      });
    } catch (metadataError) {
      setError(
        metadataError instanceof Error
          ? metadataError.message
          : "Could not inspect image metadata.",
      );
    } finally {
      setIsReading(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setPreviewUrl("");
    setError("");

    onResultChange?.(null);
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose an image to inspect"
          description="JPG, PNG, or WebP up to 10 MB."
        />

        {isReading && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Reading metadata locally..."
            />
          </div>
        )}

        {error && (
          <div className="mt-4">
            <ProgressPanel status="ERROR" message={error} />
          </div>
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

          <p className="mt-2 text-sm text-muted">
            Metadata was inspected locally in your browser.
          </p>

          <button
            type="button"
            onClick={handleRemoveFile}
            className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
          >
            Inspect another image
          </button>
        </div>
      </div>
    </div>
  );
}
