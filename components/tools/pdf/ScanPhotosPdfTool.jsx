"use client";

import Image from "next/image";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { createScannedPdfFromImages } from "@/lib/tools/pdf/createScannedPdfFromImages";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MAX_FILES = 15;

const MODES = [
  [
    "ENHANCE",
    "Document Enhance",
    "Higher contrast grayscale for readable document photos.",
  ],

  ["GRAYSCALE", "Grayscale", "Remove color while preserving softer tones."],

  ["ORIGINAL", "Original", "Keep the original photo appearance."],
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

export default function ScanPhotosPdfTool({ onResultChange }) {
  const [items, setItems] = useState([]);

  const itemsRef = useRef([]);

  const [mode, setMode] = useState("ENHANCE");

  const [pageSize, setPageSize] = useState("A4");

  const [margin, setMargin] = useState(24);

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

  function handleFilesSelected(files) {
    if (files.length > MAX_FILES) {
      setError(`Choose no more than ${MAX_FILES} document photos.`);

      return;
    }

    const invalid = files.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );

    if (invalid) {
      setError(`"${invalid.name}" must be JPG, PNG, or WebP.`);

      return;
    }

    for (const item of itemsRef.current) {
      URL.revokeObjectURL(item.previewUrl);
    }

    const nextItems = files.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${index}`,

      file,

      previewUrl: URL.createObjectURL(file),
    }));

    updateItems(nextItems);

    clearResult();
  }

  function moveItem(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= items.length) {
      return;
    }

    const nextItems = [...items];

    [nextItems[index], nextItems[target]] = [
      nextItems[target],
      nextItems[index],
    ];

    updateItems(nextItems);

    clearResult();
  }

  function removeItem(index) {
    const item = items[index];

    if (item) {
      URL.revokeObjectURL(item.previewUrl);
    }

    updateItems(items.filter((_, itemIndex) => itemIndex !== index));

    clearResult();
  }

  async function handleCreate() {
    if (items.length === 0 || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await createScannedPdfFromImages(
        items.map((item) => item.file),
        {
          mode,
          pageSize,
          margin,
        },
      );

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: "ai-media-scanned-document.pdf",
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Could not create the scanned PDF.",
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
          title="Choose document photos"
          description="Add up to 15 phone photos of notes, receipts, forms, or documents."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Page order</p>

          <p className="mt-1 text-sm text-muted">
            The PDF will follow this exact order.
          </p>

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
                  <p className="truncate text-sm font-semibold">
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
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-border disabled:opacity-30"
                  >
                    <ArrowUp size={17} />
                  </button>

                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-border disabled:opacity-30"
                  >
                    <ArrowDown size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <p className="font-semibold text-foreground">Scan appearance</p>

            <div className="mt-4 grid gap-3">
              {MODES.map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMode(value);

                    clearResult();
                  }}
                  className={`rounded-xl border p-4 text-left ${
                    mode === value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface"
                  }`}
                >
                  <p className="font-semibold text-foreground">{label}</p>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    {description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <p className="font-semibold text-foreground">PDF layout</p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["A4", "A4"],
                ["FIT", "Fit Photo"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setPageSize(value);

                    clearResult();
                  }}
                  className={`min-h-11 rounded-xl border font-semibold ${
                    pageSize === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm font-semibold">Margin</p>

            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                [0, "None"],
                [24, "Normal"],
                [48, "Wide"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMargin(value);

                    clearResult();
                  }}
                  className={`min-h-11 rounded-xl border text-sm font-semibold ${
                    margin === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleCreate}
        disabled={items.length === 0 || isProcessing}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Creating Scan PDF..."
          : `Create Scanned PDF${
              items.length ? ` (${items.length} pages)` : ""
            }`}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Document photos are processed locally.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Enhancing document photos and creating PDF locally..."
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
            message="Scanned document PDF created successfully."
          />
        </div>
      )}
    </div>
  );
}
