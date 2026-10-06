"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { createPassportPhoto } from "@/lib/tools/image/createPassportPhoto";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PHOTO_PRESETS = [
  {
    id: "35x45",
    label: "35 × 45 mm",
    description: "Common passport / ID size",
    width: 413,
    height: 531,
  },
  {
    id: "2x2",
    label: "2 × 2 inch",
    description: "Square ID photo",
    width: 600,
    height: 600,
  },
  {
    id: "profile",
    label: "600 × 800",
    description: "Forms / profile use",
    width: 600,
    height: 800,
  },
  {
    id: "square",
    label: "600 × 600",
    description: "Square profile",
    width: 600,
    height: 600,
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

function createOutputFilename(file, mimeType, presetId) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const extension = mimeType === "image/png" ? "png" : "jpg";

  return `${baseName}-id-${presetId}.${extension}`;
}

export default function PassportPhotoTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [error, setError] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [presetId, setPresetId] = useState("35x45");

  const [zoom, setZoom] = useState(1);

  const [verticalPosition, setVerticalPosition] = useState(50);

  const [outputMimeType, setOutputMimeType] = useState("image/jpeg");

  const [isProcessing, setIsProcessing] = useState(false);

  const [resultUrl, setResultUrl] = useState("");

  const selectedPreset =
    PHOTO_PRESETS.find((preset) => preset.id === presetId) || PHOTO_PRESETS[0];

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

      setFile(selectedFile);
      setPreviewUrl(objectUrl);

      setDimensions({
        width: bitmap.width,
        height: bitmap.height,
      });

      setPresetId("35x45");
      setZoom(1);
      setVerticalPosition(50);
      setOutputMimeType("image/jpeg");

      setError("");
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

    setDimensions({
      width: 0,
      height: 0,
    });

    setPresetId("35x45");
    setZoom(1);
    setVerticalPosition(50);

    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  async function handleCreate() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const result = await createPassportPhoto(file, {
        width: selectedPreset.width,

        height: selectedPreset.height,

        zoom,

        verticalPosition,

        outputMimeType,
      });

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,
        resultUrl: objectUrl,

        preset: selectedPreset.label,

        filename: createOutputFilename(
          file,
          result.mimeType,
          selectedPreset.id,
        ),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Something went wrong while preparing the photo.",
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
          title="Choose your photo"
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

            <span>
              {dimensions.width} × {dimensions.height}px
            </span>
          </div>

          <button
            type="button"
            onClick={handleRemoveFile}
            className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            Choose another photo
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Photo size</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Choose a preset. Always verify the exact requirements of the form,
          visa, college, employer, or authority you are submitting to.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {PHOTO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setPresetId(preset.id);

                clearResult();
              }}
              className={`rounded-xl border p-4 text-left transition ${
                presetId === preset.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <p className="font-semibold text-foreground">{preset.label}</p>

              <p className="mt-1 text-xs text-muted">{preset.description}</p>

              <p className="mt-2 text-xs font-medium text-muted">
                {preset.width} × {preset.height}px
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Adjust framing</p>

        <div className="mt-5 overflow-hidden rounded-xl border border-border bg-slate-100 p-4">
          <div
            className="relative mx-auto max-h-96 w-full max-w-72 overflow-hidden bg-white"
            style={{
              aspectRatio: `${selectedPreset.width} / ${selectedPreset.height}`,
            }}
          >
            <Image
              src={previewUrl}
              alt="ID framing preview"
              fill
              unoptimized
              sizes="300px"
              className="object-cover"
              style={{
                objectPosition: `50% ${verticalPosition}%`,
                transform: `scale(${zoom})`,
              }}
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Zoom</p>

            <span className="text-sm font-semibold text-primary">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="2"
            step="0.05"
            value={zoom}
            onChange={(event) => {
              setZoom(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Vertical position
            </p>

            <span className="text-sm font-semibold text-primary">
              {verticalPosition}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={verticalPosition}
            onChange={(event) => {
              setVerticalPosition(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-foreground">Output format</p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setOutputMimeType("image/jpeg");

                clearResult();
              }}
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
                outputMimeType === "image/jpeg"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground"
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
              className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
                outputMimeType === "image/png"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              PNG
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? "Preparing..." : "Create ID Photo"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Preparing your photo locally..."
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
            message="ID photo prepared successfully."
          />
        </div>
      )}
    </div>
  );
}
