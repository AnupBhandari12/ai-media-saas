"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { convertImageFormat } from "@/lib/tools/image/convertImageFormat";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

const OUTPUT_FORMATS = [
  {
    label: "JPG",
    mimeType: "image/jpeg",
    extension: "jpg",
  },
  {
    label: "PNG",
    mimeType: "image/png",
    extension: "png",
  },
  {
    label: "WebP",
    mimeType: "image/webp",
    extension: "webp",
  },
  {
    label: "AVIF",
    mimeType: "image/avif",
    extension: "avif",
  },
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

function getDefaultOutputFormat(inputMimeType) {
  if (inputMimeType === "image/webp") {
    return "image/jpeg";
  }

  return "image/webp";
}

function createOutputFilename(file, outputMimeType) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const format = OUTPUT_FORMATS.find(
    (item) => item.mimeType === outputMimeType,
  );

  return `${baseName}-converted.${format?.extension || "jpg"}`;
}

export default function ConvertImageTool({ onResultChange }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [error, setError] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [outputMimeType, setOutputMimeType] = useState("image/webp");

  const [quality, setQuality] = useState(90);

  const [isConverting, setIsConverting] = useState(false);

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
      setError("Please choose a JPG, PNG, WebP, or AVIF image.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Image must be 10 MB or smaller.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);

      const defaultOutput = getDefaultOutputFormat(selectedFile.type);

      setFile(selectedFile);
      setPreviewUrl(objectUrl);

      setDimensions({
        width: bitmap.width,
        height: bitmap.height,
      });

      setOutputMimeType(defaultOutput);
      setQuality(90);

      setError("");
      setResultUrl("");
      onResultChange?.(null);

      bitmap.close();
    } catch {
      setError("This browser could not read the selected image.");
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setPreviewUrl("");

    setDimensions({
      width: 0,
      height: 0,
    });

    setOutputMimeType("image/webp");
    setQuality(90);

    setError("");
    setResultUrl("");
    onResultChange?.(null);
  }

  function handleOutputFormat(mimeType) {
    setOutputMimeType(mimeType);
    clearResult();
  }

  async function handleConvert() {
    if (!file || isConverting) {
      return;
    }

    try {
      setIsConverting(true);
      setError("");
      setResultUrl("");
      onResultChange?.(null);

      const convertedResult = await convertImageFormat(
        file,
        outputMimeType,
        quality,
      );

      const objectUrl = URL.createObjectURL(convertedResult.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result: convertedResult,
        resultUrl: objectUrl,
        filename: createOutputFilename(file, convertedResult.outputMimeType),
      });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "Something went wrong while converting the image.",
      );
    } finally {
      setIsConverting(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp,image/avif"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Drop your image here"
          description="JPG, PNG, WebP, or supported AVIF images up to 10 MB."
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

            <span>{file.type}</span>
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
        <p className="font-semibold text-foreground">Output format</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Choose the format for the converted image.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OUTPUT_FORMATS.map((format) => {
            const isSelected = outputMimeType === format.mimeType;

            return (
              <button
                key={format.mimeType}
                type="button"
                onClick={() => handleOutputFormat(format.mimeType)}
                className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-foreground hover:border-primary/40"
                }`}
              >
                {format.label}
              </button>
            );
          })}
        </div>

        {outputMimeType === "image/jpeg" && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
            JPG does not support transparency. Transparent areas will be filled
            with white.
          </div>
        )}

        {outputMimeType === "image/avif" && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
            AVIF encoding depends on browser support. AI Media will show an
            error instead of silently returning the wrong format.
          </div>
        )}

        {outputMimeType !== "image/png" && (
          <div className="mt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Output quality
                </p>

                <p className="mt-1 text-xs text-muted">
                  Lower quality can reduce file size.
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

                clearResult();
              }}
              className="mt-5 w-full accent-indigo-600"
              aria-label="Output quality"
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleConvert}
        disabled={isConverting}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isConverting ? "Converting..." : "Convert Image"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally when the selected format is supported by your
        browser.
      </p>

      {isConverting && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Converting your image locally on this device..."
          />
        </div>
      )}

      {!isConverting && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isConverting && resultUrl && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message="Image converted successfully."
          />
        </div>
      )}
    </div>
  );
}
