"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { blurRedactImage } from "@/lib/tools/image/blurRedactImage";

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

function createOutputFilename(file, mimeType, mode) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return `${baseName}-${mode}.${extensionMap[mimeType] || "jpg"}`;
}

export default function BlurRedactTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [region, setRegion] = useState({
    x: 0,
    y: 0,
    width: "",
    height: "",
  });

  const [mode, setMode] = useState("blur");

  const [blurAmount, setBlurAmount] = useState(18);

  const [redactColor, setRedactColor] = useState("#000000");

  const [isProcessing, setIsProcessing] = useState(false);

  const [resultUrl, setResultUrl] = useState("");

  const [error, setError] = useState("");

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

  const x = Number(region.x);
  const y = Number(region.y);
  const width = Number(region.width);
  const height = Number(region.height);

  const validRegion =
    region.x !== "" &&
    region.y !== "" &&
    region.width !== "" &&
    region.height !== "" &&
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    x >= 0 &&
    y >= 0 &&
    width >= 1 &&
    height >= 1 &&
    x + width <= dimensions.width &&
    y + height <= dimensions.height;

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

      setRegion({
        x: Math.round(bitmap.width * 0.25),

        y: Math.round(bitmap.height * 0.25),

        width: Math.max(1, Math.round(bitmap.width * 0.5)),

        height: Math.max(1, Math.round(bitmap.height * 0.5)),
      });

      setMode("blur");
      setBlurAmount(18);
      setRedactColor("#000000");

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

    setRegion({
      x: 0,
      y: 0,
      width: "",
      height: "",
    });

    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  function updateRegion(field, value) {
    setRegion((current) => ({
      ...current,
      [field]: value,
    }));

    clearResult();
  }

  async function handleProcess() {
    if (!file || !validRegion || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const result = await blurRedactImage(file, {
        ...region,
        mode,
        blurAmount,
        redactColor,
      });

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: createOutputFilename(file, result.mimeType, mode),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Something went wrong while processing the region.",
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

            <span>
              {dimensions.width} × {dimensions.height}px
            </span>
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
        <p className="font-semibold text-foreground">Protection mode</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("blur");
              clearResult();
            }}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
              mode === "blur"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Blur
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("redact");
              clearResult();
            }}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
              mode === "redact"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Redact
          </button>
        </div>

        {mode === "blur" ? (
          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-foreground">
                Blur strength
              </span>

              <span className="text-primary">{blurAmount}px</span>
            </div>

            <input
              type="range"
              min="2"
              max="40"
              step="1"
              value={blurAmount}
              onChange={(event) => {
                setBlurAmount(Number(event.target.value));

                clearResult();
              }}
              className="mt-3 w-full accent-indigo-600"
            />
          </div>
        ) : (
          <div className="mt-5 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-foreground">
              Redact color
            </span>

            <input
              type="color"
              value={redactColor}
              onChange={(event) => {
                setRedactColor(event.target.value);

                clearResult();
              }}
              className="h-11 w-16 rounded-lg border border-border p-1"
            />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Region</p>

        <p className="mt-1 text-sm text-muted">
          Enter the pixel area that should be hidden.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["x", "Start X", 0],
            ["y", "Start Y", 0],
            ["width", "Width", 1],
            ["height", "Height", 1],
          ].map(([field, label, min]) => (
            <div key={field}>
              <label
                htmlFor={`region-${field}`}
                className="text-sm font-semibold text-foreground"
              >
                {label}
              </label>

              <div className="mt-2 flex overflow-hidden rounded-xl border border-border bg-surface">
                <input
                  id={`region-${field}`}
                  type="number"
                  min={min}
                  value={region[field]}
                  onChange={(event) => updateRegion(field, event.target.value)}
                  className="min-h-11 w-full bg-transparent px-4 text-sm outline-none"
                />

                <span className="border-l border-border px-4 py-3 text-sm text-muted">
                  px
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            Selected area
          </p>

          <p className="mt-1 font-semibold text-foreground">
            {validRegion
              ? `${width} × ${height}px at X ${x}, Y ${y}`
              : "Invalid region"}
          </p>
        </div>

        {!validRegion && (
          <p className="mt-3 text-sm font-medium text-red-600">
            Region must stay inside the {dimensions.width} × {dimensions.height}
            px image.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={isProcessing || !validRegion}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Processing..."
          : mode === "blur"
            ? "Blur Region"
            : "Redact Region"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Protecting the selected region locally..."
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
            message="Selected region processed successfully."
          />
        </div>
      )}
    </div>
  );
}
