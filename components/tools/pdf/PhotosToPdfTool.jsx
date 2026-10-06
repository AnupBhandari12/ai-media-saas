"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { createPdfFromImages } from "@/lib/tools/pdf/createPdfFromImages";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

const MAX_FILES = 15;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MARGIN_PRESETS = [
  {
    label: "None",
    value: 0,
  },
  {
    label: "Small",
    value: 18,
  },
  {
    label: "Medium",
    value: 36,
  },
  {
    label: "Large",
    value: 54,
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

export default function PhotosToPdfTool({ onResultChange }) {
  const [items, setItems] = useState([]);

  const itemsRef = useRef([]);

  const [pageSize, setPageSize] = useState("A4");

  const [orientation, setOrientation] = useState("AUTO");

  const [margin, setMargin] = useState(36);

  const [quality, setQuality] = useState(90);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  useEffect(() => {
    return () => {
      for (const item of itemsRef.current) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function updateItems(nextItems) {
    itemsRef.current = nextItems;

    setItems(nextItems);
  }

  function clearResult() {
    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  function handleFilesSelected(selectedFiles) {
    if (selectedFiles.length > MAX_FILES) {
      setError(`Choose no more than ${MAX_FILES} photos.`);

      return;
    }

    const invalid = selectedFiles.find(
      (file) => !ALLOWED_TYPES.includes(file.type),
    );

    if (invalid) {
      setError(`"${invalid.name}" must be JPG, PNG, or WebP.`);

      return;
    }

    const oversized = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (oversized) {
      setError(`"${oversized.name}" is larger than 10 MB.`);

      return;
    }

    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Combined image size must be 50 MB or smaller.");

      return;
    }

    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.previewUrl);
    }

    const nextItems = selectedFiles.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${index}`,

      file,

      previewUrl: URL.createObjectURL(file),
    }));

    updateItems(nextItems);

    clearResult();
  }

  function removeItem(index) {
    const removed = items[index];

    if (removed) {
      URL.revokeObjectURL(removed.previewUrl);
    }

    const nextItems = items.filter((_, itemIndex) => itemIndex !== index);

    updateItems(nextItems);

    clearResult();
  }

  function moveItem(index, direction) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const nextItems = [...items];

    [nextItems[index], nextItems[targetIndex]] = [
      nextItems[targetIndex],
      nextItems[index],
    ];

    updateItems(nextItems);

    clearResult();
  }

  function clearAll() {
    for (const item of items) {
      URL.revokeObjectURL(item.previewUrl);
    }

    updateItems([]);

    clearResult();
  }

  async function handleCreatePdf() {
    if (items.length === 0 || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const result = await createPdfFromImages(
        items.map((item) => item.file),
        {
          pageSize,
          orientation,
          margin,
          qualityPercent: quality,
        },
      );

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: "ai-media-photos.pdf",
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Something went wrong while creating the PDF.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      {items.length === 0 ? (
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          multiple
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose photos for your PDF"
          description="JPG, PNG, or WebP. Up to 15 photos, 10 MB each, 50 MB combined."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Photo order</p>

              <p className="mt-1 text-sm text-muted">
                PDF pages follow this exact order.
              </p>
            </div>

            <button
              type="button"
              onClick={clearAll}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-foreground"
            >
              Clear
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="relative h-14 w-14 overflow-hidden rounded-lg bg-slate-100">
                  <Image
                    src={item.previewUrl}
                    alt={item.file.name}
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {index + 1}. {item.file.name}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {formatBytes(item.file.size)}
                  </p>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move photo up"
                  >
                    <ArrowUp size={17} />
                  </button>

                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Move photo down"
                  >
                    <ArrowDown size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-red-600"
                    aria-label="Remove photo"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <FileDropzone
              accept="image/jpeg,image/png,image/webp"
              multiple
              maxSizeBytes={MAX_FILE_SIZE}
              onFilesSelected={handleFilesSelected}
              title="Replace selected photos"
              description="Choose another group of photos."
            />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">PDF settings</p>

        <div className="mt-5">
          <p className="text-sm font-semibold text-foreground">Page size</p>

          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              ["A4", "A4"],
              ["LETTER", "Letter"],
              ["FIT", "Fit Photo"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPageSize(value);

                  clearResult();
                }}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                  pageSize === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {pageSize !== "FIT" && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-foreground">Orientation</p>

            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                ["AUTO", "Auto"],
                ["PORTRAIT", "Portrait"],
                ["LANDSCAPE", "Landscape"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setOrientation(value);

                    clearResult();
                  }}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                    orientation === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="text-sm font-semibold text-foreground">Page margin</p>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MARGIN_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setMargin(preset.value);

                  clearResult();
                }}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                  margin === preset.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Image quality
              </p>

              <p className="mt-1 text-xs text-muted">
                Higher quality may create a larger PDF.
              </p>
            </div>

            <span className="font-semibold text-primary">{quality}%</span>
          </div>

          <input
            type="range"
            min="60"
            max="95"
            step="5"
            value={quality}
            onChange={(event) => {
              setQuality(Number(event.target.value));

              clearResult();
            }}
            className="mt-4 w-full accent-indigo-600"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreatePdf}
        disabled={items.length === 0 || isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing
          ? "Creating PDF..."
          : `Create PDF${items.length ? ` (${items.length} pages)` : ""}`}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Your photos are processed locally in your browser.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Preparing photos and building your PDF locally..."
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
          <ProgressPanel status="SUCCESS" message="PDF created successfully." />
        </div>
      )}
    </div>
  );
}
