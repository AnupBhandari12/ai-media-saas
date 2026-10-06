"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { watermarkImage } from "@/lib/tools/image/watermarkImage";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const POSITIONS = [
  "top-left",
  "top-center",
  "top-right",

  "center-left",
  "center",
  "center-right",

  "bottom-left",
  "bottom-center",
  "bottom-right",
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

  return `${baseName}-watermarked.${extension}`;
}

function prettyPosition(position) {
  return position
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function WatermarkImageTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [error, setError] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [type, setType] = useState("text");

  const [text, setText] = useState("AI Media");

  const [watermarkFile, setWatermarkFile] = useState(null);

  const [position, setPosition] = useState("bottom-right");

  const [opacity, setOpacity] = useState(60);

  const [sizePercent, setSizePercent] = useState(8);

  const [color, setColor] = useState("#ffffff");

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

    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  function handleWatermarkFile(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setWatermarkFile(null);
      clearResult();
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Watermark image must be JPG, PNG, or WebP.");

      setWatermarkFile(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Watermark image must be 5 MB or smaller.");

      setWatermarkFile(null);
      return;
    }

    setWatermarkFile(selectedFile);

    clearResult();
  }

  const canProcess =
    type === "text" ? text.trim().length > 0 : Boolean(watermarkFile);

  async function handleProcess() {
    if (!file || !canProcess || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const result = await watermarkImage(file, {
        type,
        text,
        watermarkFile,

        position,

        opacity: opacity / 100,

        sizePercent,
        color,
      });

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: createOutputFilename(file, result.mimeType),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Something went wrong while adding the watermark.",
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
            className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/40"
          >
            Choose another image
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Watermark type</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setType("text");
              setSizePercent(8);
              clearResult();
            }}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
              type === "text"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-foreground"
            }`}
          >
            Text
          </button>

          <button
            type="button"
            onClick={() => {
              setType("image");
              setSizePercent(20);
              clearResult();
            }}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-semibold ${
              type === "image"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface text-foreground"
            }`}
          >
            Logo / Image
          </button>
        </div>

        {type === "text" ? (
          <div className="mt-5">
            <label
              htmlFor="watermark-text"
              className="text-sm font-semibold text-foreground"
            >
              Watermark text
            </label>

            <input
              id="watermark-text"
              type="text"
              value={text}
              maxLength={80}
              onChange={(event) => {
                setText(event.target.value);

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none"
            />

            <div className="mt-4 flex items-center justify-between gap-4">
              <label
                htmlFor="watermark-color"
                className="text-sm font-semibold text-foreground"
              >
                Text color
              </label>

              <input
                id="watermark-color"
                type="color"
                value={color}
                onChange={(event) => {
                  setColor(event.target.value);

                  clearResult();
                }}
                className="h-11 w-16 cursor-pointer rounded-lg border border-border bg-background p-1"
              />
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <label
              htmlFor="watermark-file"
              className="text-sm font-semibold text-foreground"
            >
              Watermark logo
            </label>

            <input
              id="watermark-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleWatermarkFile}
              className="mt-2 block w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
            />

            {watermarkFile && (
              <p className="mt-2 truncate text-xs text-muted">
                {watermarkFile.name}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Position</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {POSITIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setPosition(item);
                clearResult();
              }}
              className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                position === item
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground hover:border-primary/40"
              }`}
            >
              {prettyPosition(item)}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Opacity</p>

            <span className="text-sm font-semibold text-primary">
              {opacity}%
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={opacity}
            onChange={(event) => {
              setOpacity(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Watermark size
            </p>

            <span className="text-sm font-semibold text-primary">
              {sizePercent}%
            </span>
          </div>

          <input
            type="range"
            min="2"
            max="50"
            step="1"
            value={sizePercent}
            onChange={(event) => {
              setSizePercent(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={!canProcess || isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing ? "Adding watermark..." : "Add Watermark"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Processing runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Adding your watermark locally..."
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
            message="Watermark added successfully."
          />
        </div>
      )}
    </div>
  );
}
