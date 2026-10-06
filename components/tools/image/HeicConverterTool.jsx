"use client";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { convertHeicImage } from "@/lib/tools/image/convertHeicImage";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isHeicFilename(file) {
  const name = file.name.toLowerCase();

  return name.endsWith(".heic") || name.endsWith(".heif");
}

function createFilename(file, mimeType) {
  const dot = file.name.lastIndexOf(".");

  const baseName = dot > 0 ? file.name.slice(0, dot) : file.name;

  const extension = mimeType === "image/png" ? "png" : "jpg";

  return `${baseName}-converted.${extension}`;
}

export default function HeicConverterTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [outputMimeType, setOutputMimeType] = useState("image/jpeg");

  const [quality, setQuality] = useState(90);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function clearResult() {
    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  function handleFilesSelected(files) {
    const selectedFile = files[0];

    if (!selectedFile) {
      return;
    }

    if (!isHeicFilename(selectedFile)) {
      setError("Please choose a .heic or .heif file.");

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("HEIC / HEIF image must be 25 MB or smaller.");

      return;
    }

    setFile(selectedFile);

    setOutputMimeType("image/jpeg");

    setQuality(90);

    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  function handleRemoveFile() {
    setFile(null);
    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  async function handleConvert() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const result = await convertHeicImage(file, {
        outputMimeType,
        qualityPercent: quality,
      });

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: createFilename(file, result.outputMimeType),
      });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "HEIC conversion failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept=".heic,.heif,image/heic,image/heif"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose a HEIC / HEIF photo"
          description="iPhone HEIC or HEIF image up to 25 MB."
        />

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">{file.name}</p>

        <p className="mt-2 text-sm text-muted">{formatBytes(file.size)}</p>

        <p className="mt-2 text-xs leading-6 text-muted">
          HEIC files are decoded locally before a browser preview can be
          created.
        </p>

        <button
          type="button"
          onClick={handleRemoveFile}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
        >
          Choose another photo
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Output format</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setOutputMimeType("image/jpeg");

              clearResult();
            }}
            className={`min-h-11 rounded-xl border px-4 font-semibold ${
              outputMimeType === "image/jpeg"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            JPG
          </button>

          <button
            type="button"
            onClick={() => {
              setOutputMimeType("image/png");

              clearResult();
            }}
            className={`min-h-11 rounded-xl border px-4 font-semibold ${
              outputMimeType === "image/png"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            PNG
          </button>
        </div>

        {outputMimeType === "image/jpeg" && (
          <div className="mt-6">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-foreground">JPG quality</span>

              <span className="font-semibold text-primary">{quality}%</span>
            </div>

            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={quality}
              onChange={(event) => {
                setQuality(Number(event.target.value));

                clearResult();
              }}
              className="mt-3 w-full accent-indigo-600"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleConvert}
        disabled={isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Converting..." : "Convert HEIC"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Conversion runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Decoding and converting the HEIC image locally..."
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
            message="HEIC image converted successfully."
          />
        </div>
      )}
    </div>
  );
}
