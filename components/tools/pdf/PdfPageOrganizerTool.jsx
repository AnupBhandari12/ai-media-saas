"use client";

import Image from "next/image";

import { ArrowDown, ArrowUp, RotateCcw, RotateCw, Trash2 } from "lucide-react";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { renderPdfThumbnails } from "@/lib/tools/pdf/renderPdfThumbnails";

import {
  deletePdfPages,
  reorderPdfPages,
  rotatePdfPages,
} from "@/lib/tools/pdf/organizePdfPages";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFilename(file, mode) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  const suffix = {
    delete: "pages-deleted",

    reorder: "reordered",

    rotate: "rotated",
  };

  return `${base}-${suffix[mode]}.pdf`;
}

export default function PdfPageOrganizerTool({ mode, onResultChange }) {
  const [file, setFile] = useState(null);

  const [pages, setPages] = useState([]);

  const [selectedPages, setSelectedPages] = useState([]);

  const [rotation, setRotation] = useState(90);

  const [isLoading, setIsLoading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [resultUrl, setResultUrl] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      for (const page of pages) {
        if (page.thumbnailUrl) {
          URL.revokeObjectURL(page.thumbnailUrl);
        }
      }
    };
  }, [pages]);

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

    try {
      setIsLoading(true);

      clearResult();

      const result = await renderPdfThumbnails(selectedFile);

      const nextPages = result.pages.map((page) => ({
        pageNumber: page.pageNumber,

        thumbnailUrl: URL.createObjectURL(page.thumbnailBlob),
      }));

      setFile(selectedFile);

      setPages(nextPages);

      setSelectedPages([]);

      setRotation(90);
    } catch (loadError) {
      setFile(null);

      setPages([]);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "The PDF could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);

    setPages([]);

    setSelectedPages([]);

    setRotation(90);

    clearResult();
  }

  function togglePage(pageNumber) {
    if (mode === "reorder") {
      return;
    }

    setSelectedPages((current) =>
      current.includes(pageNumber)
        ? current.filter((page) => page !== pageNumber)
        : [...current, pageNumber],
    );

    clearResult();
  }

  function selectAll() {
    setSelectedPages(pages.map((page) => page.pageNumber));

    clearResult();
  }

  function clearSelection() {
    setSelectedPages([]);

    clearResult();
  }

  function movePage(index, direction) {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= pages.length) {
      return;
    }

    const nextPages = [...pages];

    [nextPages[index], nextPages[targetIndex]] = [
      nextPages[targetIndex],
      nextPages[index],
    ];

    setPages(nextPages);

    clearResult();
  }

  async function handleProcess() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      let result;

      if (mode === "delete") {
        result = await deletePdfPages(file, selectedPages);
      }

      if (mode === "reorder") {
        result = await reorderPdfPages(
          file,
          pages.map((page) => page.pageNumber),
        );
      }

      if (mode === "rotate") {
        result = await rotatePdfPages(file, {
          selectedPages,

          degrees: rotation,
        });
      }

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: getFilename(file, mode),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "PDF processing failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="application/pdf,.pdf"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose a PDF"
          description="PDF up to 30 MB and 60 pages for browser Page Organizer."
        />

        {isLoading && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Rendering PDF page previews locally..."
            />
          </div>
        )}

        {!isLoading && error && (
          <div className="mt-4">
            <ProgressPanel status="ERROR" message={error} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="truncate font-semibold text-foreground">{file.name}</p>

        <p className="mt-2 text-sm text-muted">
          {formatBytes(file.size)} · {pages.length} pages
        </p>

        <button
          type="button"
          onClick={handleRemoveFile}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
        >
          Choose another PDF
        </button>
      </div>

      {mode !== "reorder" && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
          >
            Select all
          </button>

          <button
            type="button"
            onClick={clearSelection}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
          >
            Clear selection
          </button>

          <span className="flex min-h-11 items-center rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary">
            {selectedPages.length} selected
          </span>
        </div>
      )}

      {mode === "rotate" && (
        <div className="mt-5 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Rotation</p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              [270, "Left 90°"],

              [90, "Right 90°"],

              [180, "180°"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setRotation(value);

                  clearResult();
                }}
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                  rotation === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {pages.map((page, index) => {
          const selected = selectedPages.includes(page.pageNumber);

          return (
            <div
              key={page.pageNumber}
              className={`overflow-hidden rounded-2xl border bg-background ${
                selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => togglePage(page.pageNumber)}
                className="block w-full"
                disabled={mode === "reorder"}
              >
                <div className="relative aspect-3/4 bg-slate-100">
                  <Image
                    src={page.thumbnailUrl}
                    alt={`Page ${page.pageNumber}`}
                    fill
                    unoptimized
                    sizes="180px"
                    className="object-contain p-2"
                  />
                </div>
              </button>

              <div className="border-t border-border p-3">
                <p className="text-center text-sm font-semibold text-foreground">
                  Page {page.pageNumber}
                </p>

                {mode === "delete" && (
                  <p className="mt-1 text-center text-xs text-muted">
                    {selected ? "Will be deleted" : "Tap to select"}
                  </p>
                )}

                {mode === "rotate" && (
                  <p className="mt-1 text-center text-xs text-muted">
                    {selected ? "Will rotate" : "Tap to select"}
                  </p>
                )}

                {mode === "reorder" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePage(index, -1)}
                      className="flex min-h-11 items-center justify-center rounded-lg border border-border disabled:opacity-30"
                      aria-label="Move page up"
                    >
                      <ArrowUp size={17} />
                    </button>

                    <button
                      type="button"
                      disabled={index === pages.length - 1}
                      onClick={() => movePage(index, 1)}
                      className="flex min-h-11 items-center justify-center rounded-lg border border-border disabled:opacity-30"
                      aria-label="Move page down"
                    >
                      <ArrowDown size={17} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={
          isProcessing || (mode !== "reorder" && selectedPages.length === 0)
        }
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Processing..."
          : mode === "delete"
            ? `Delete ${selectedPages.length || ""} Page${
                selectedPages.length === 1 ? "" : "s"
              }`
            : mode === "reorder"
              ? "Save New Page Order"
              : `Rotate ${selectedPages.length || ""} Page${
                  selectedPages.length === 1 ? "" : "s"
                }`}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Page changes run locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating the updated PDF locally..."
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
            message="Updated PDF created successfully."
          />
        </div>
      )}
    </div>
  );
}
