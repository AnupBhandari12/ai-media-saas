"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { renderPdfThumbnails } from "@/lib/tools/pdf/renderPdfThumbnails";
import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";
import { cropPdfPages } from "@/lib/tools/pdf/enhancePdf";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const MAX_PAGES = 60;

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function outputFilename(file) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  return `${base}-cropped.pdf`;
}

export default function CropPdfTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pages, setPages] = useState([]);

  const [selection, setSelection] = useState("all");

  const [top, setTop] = useState(5);

  const [right, setRight] = useState(5);

  const [bottom, setBottom] = useState(5);

  const [left, setLeft] = useState(5);

  const [isLoading, setIsLoading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  useEffect(() => {
    return () => {
      for (const page of pages) {
        URL.revokeObjectURL(page.thumbnailUrl);
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

  const selectionState = useMemo(() => {
    if (pages.length === 0) {
      return {
        pages: [],
        error: "",
      };
    }

    try {
      return {
        pages: parsePageSelection(selection, pages.length, MAX_PAGES),

        error: "",
      };
    } catch (selectionError) {
      return {
        pages: [],

        error:
          selectionError instanceof Error
            ? selectionError.message
            : "Invalid page selection.",
      };
    }
  }, [selection, pages.length]);

  const cropError =
    left + right >= 90
      ? "Left + right crop must leave at least 10% visible."
      : top + bottom >= 90
        ? "Top + bottom crop must leave at least 10% visible."
        : top === 0 && right === 0 && bottom === 0 && left === 0
          ? "Increase at least one crop margin."
          : "";

  const previewPage =
    pages.find((page) => page.pageNumber === selectionState.pages[0]) ||
    pages[0];

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

      setSelection("all");

      setTop(5);
      setRight(5);
      setBottom(5);
      setLeft(5);
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
    setSelection("all");
    clearResult();
  }

  async function handleCrop() {
    if (!file || selectionState.error || cropError || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      clearResult();

      const result = await cropPdfPages(file, {
        pageSelection: selection,

        top,
        right,
        bottom,
        left,
      });

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: outputFilename(file),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "PDF crop failed.",
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
          title="Choose a PDF to crop"
          description="PDF up to 30 MB and 60 pages for browser preview."
        />

        {isLoading && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Rendering PDF preview locally..."
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

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Pages to crop</p>

        <input
          type="text"
          value={selection}
          onChange={(event) => {
            setSelection(event.target.value);

            clearResult();
          }}
          placeholder="all or 1-3,5"
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
        />

        {selectionState.error ? (
          <p className="mt-3 text-sm font-medium text-red-600">
            {selectionState.error}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            {selectionState.pages.length} pages selected
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Crop margins</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Percentage removed from each side of the visible page.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4">
          {[
            ["Top", top, setTop],
            ["Right", right, setRight],
            ["Bottom", bottom, setBottom],
            ["Left", left, setLeft],
          ].map(([label, value, setter]) => (
            <label
              key={label}
              className="text-sm font-semibold text-foreground"
            >
              {label}

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={value}
                  onChange={(event) => {
                    setter(
                      Math.min(40, Math.max(0, Number(event.target.value))),
                    );

                    clearResult();
                  }}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 outline-none focus:border-primary"
                />

                <span className="text-muted">%</span>
              </div>
            </label>
          ))}
        </div>

        {cropError && (
          <p className="mt-4 text-sm font-medium text-red-600">{cropError}</p>
        )}
      </div>

      {previewPage && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Crop preview</p>

          <p className="mt-1 text-sm text-muted">
            Previewing page {previewPage.pageNumber}.
          </p>

          <div className="mx-auto mt-5 max-w-sm">
            <div className="relative aspect-3/4 overflow-hidden rounded-xl border border-border bg-slate-100">
              <Image
                src={previewPage.thumbnailUrl}
                alt="PDF crop preview"
                fill
                unoptimized
                sizes="384px"
                className="object-contain p-2 opacity-50"
              />

              <div
                className="absolute border-2 border-primary bg-primary/5"
                style={{
                  top: `${top}%`,
                  right: `${right}%`,
                  bottom: `${bottom}%`,
                  left: `${left}%`,
                }}
              />
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            PDF crop uses a non-destructive crop box. Hidden page content may
            still exist inside the PDF file.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleCrop}
        disabled={isProcessing || Boolean(selectionState.error || cropError)}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Cropping PDF..." : "Crop PDF Pages"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Applying PDF crop boxes locally..."
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
            message="Cropped PDF created successfully."
          />
        </div>
      )}
    </div>
  );
}
