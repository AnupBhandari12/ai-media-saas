"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import {
  inspectPdfForManipulation,
  mergePdfFiles,
} from "@/lib/tools/pdf/manipulatePdf";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const MAX_FILES = 10;

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isPdfFile(file) {
  return (
    file?.type === "application/pdf" ||
    file?.name?.toLowerCase().endsWith(".pdf")
  );
}

export default function MergePdfTool({ onResultChange }) {
  const [items, setItems] = useState([]);

  const [isInspecting, setIsInspecting] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  function clearResult() {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setResultUrl("");

    setError("");

    onResultChange?.(null);
  }

  async function handleFilesSelected(files) {
    if (files.length > MAX_FILES) {
      setError(`Choose no more than ${MAX_FILES} PDF files.`);

      return;
    }

    const invalid = files.find((file) => !isPdfFile(file));

    if (invalid) {
      setError(`"${invalid.name}" is not a PDF file.`);

      return;
    }

    const oversized = files.find((file) => file.size > MAX_FILE_SIZE);

    if (oversized) {
      setError(`"${oversized.name}" is larger than 30 MB.`);

      return;
    }

    try {
      setIsInspecting(true);

      clearResult();

      const inspectedItems = [];

      for (const file of files) {
        const info = await inspectPdfForManipulation(file);

        inspectedItems.push({
          id: `${file.name}-${file.size}-${file.lastModified}`,

          file,

          pageCount: info.pageCount,
        });
      }

      setItems(inspectedItems);
    } catch (inspectError) {
      setItems([]);

      setError(
        inspectError instanceof Error
          ? inspectError.message
          : "One of the PDFs could not be read.",
      );
    } finally {
      setIsInspecting(false);
    }
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

    setItems(nextItems);

    clearResult();
  }

  function removeItem(index) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );

    clearResult();
  }

  async function handleMerge() {
    if (items.length < 2 || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await mergePdfFiles(items.map((item) => item.file));

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: "ai-media-merged.pdf",
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "PDF merge failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      {items.length === 0 ? (
        <FileDropzone
          accept="application/pdf,.pdf"
          multiple
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose PDFs to merge"
          description="Choose 2 to 10 PDF files, up to 30 MB each."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Merge order</p>

              <p className="mt-1 text-sm text-muted">
                PDFs will be combined in this exact order.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setItems([]);
                clearResult();
              }}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
            >
              Clear
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {index + 1}. {item.file.name}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {item.pageCount} pages · {formatBytes(item.file.size)}
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

          {items.length < 2 && (
            <p className="mt-4 text-sm font-medium text-amber-700">
              Add at least two PDFs to merge.
            </p>
          )}

          <div className="mt-5">
            <FileDropzone
              accept="application/pdf,.pdf"
              multiple
              maxSizeBytes={MAX_FILE_SIZE}
              onFilesSelected={handleFilesSelected}
              title="Replace selected PDFs"
              description="Choose a new group of PDF files."
            />
          </div>
        </div>
      )}

      {isInspecting && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Reading PDF files locally..."
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleMerge}
        disabled={items.length < 2 || isProcessing || isInspecting}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Merging PDFs..." : `Merge ${items.length || ""} PDFs`}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        PDF merging runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Combining PDF pages locally..."
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
          <ProgressPanel status="SUCCESS" message="PDFs merged successfully." />
        </div>
      )}
    </div>
  );
}
