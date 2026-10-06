"use client";

import { useEffect, useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import {
  inspectPdfFile,
  renderPdfPagesToImages,
} from "@/lib/tools/pdf/renderPdfPagesToImages";

import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const MAX_RENDER_PAGES = 25;

const FORMAT_CONFIG = {
  jpg: {
    label: "JPG",
  },

  png: {
    label: "PNG",
  },
};

const SCALE_OPTIONS = [
  {
    value: 1,
    label: "Standard",
    detail: "~72 DPI",
  },
  {
    value: 1.5,
    label: "Sharp",
    detail: "~108 DPI",
  },
  {
    value: 2,
    label: "High",
    detail: "~144 DPI",
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

function isPdfFile(file) {
  return (
    file?.type === "application/pdf" ||
    file?.name?.toLowerCase().endsWith(".pdf")
  );
}

export default function PdfToImageTool({ format, onResultChange }) {
  const config = FORMAT_CONFIG[format];

  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [pageSelection, setPageSelection] = useState("all");

  const [scale, setScale] = useState(1.5);

  const [quality, setQuality] = useState(90);

  const [isInspecting, setIsInspecting] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrls, setResultUrls] = useState([]);

  const [zipUrl, setZipUrl] = useState("");

  useEffect(() => {
    return () => {
      for (const url of resultUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [resultUrls]);

  useEffect(() => {
    return () => {
      if (zipUrl) {
        URL.revokeObjectURL(zipUrl);
      }
    };
  }, [zipUrl]);

  const selectionState = useMemo(() => {
    if (!pdfInfo) {
      return {
        pages: [],
        error: "",
      };
    }

    try {
      const pages = parsePageSelection(
        pageSelection,
        pdfInfo.pageCount,
        MAX_RENDER_PAGES,
      );

      return {
        pages,
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
  }, [pageSelection, pdfInfo]);

  function clearResult() {
    setError("");

    setResultUrls([]);

    setZipUrl("");

    onResultChange?.(null);
  }

  async function handleFilesSelected(files) {
    const selectedFile = files[0];

    if (!selectedFile) {
      return;
    }

    if (!isPdfFile(selectedFile)) {
      setError("Please choose a PDF file.");

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("PDF must be 30 MB or smaller.");

      return;
    }

    try {
      setIsInspecting(true);

      setError("");

      setPdfInfo(null);

      clearResult();

      const info = await inspectPdfFile(selectedFile);

      setFile(selectedFile);

      setPdfInfo(info);

      setPageSelection(
        info.pageCount > MAX_RENDER_PAGES ? `1-${MAX_RENDER_PAGES}` : "all",
      );

      setScale(1.5);
      setQuality(90);
    } catch (inspectError) {
      setFile(null);

      setPdfInfo(null);

      setError(
        inspectError instanceof Error
          ? inspectError.message
          : "The PDF could not be opened.",
      );
    } finally {
      setIsInspecting(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);

    setPdfInfo(null);

    setPageSelection("all");

    setScale(1.5);
    setQuality(90);

    clearResult();
  }

  async function handleConvert() {
    if (
      !file ||
      !pdfInfo ||
      selectionState.error ||
      selectionState.pages.length === 0 ||
      isProcessing
    ) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");

      setResultUrls([]);

      setZipUrl("");

      onResultChange?.(null);

      const result = await renderPdfPagesToImages(file, {
        format,

        pageSelection,

        scale,

        qualityPercent: quality,
      });

      const urls = result.results.map((item) => URL.createObjectURL(item.blob));

      const generatedZipUrl = result.zipBlob
        ? URL.createObjectURL(result.zipBlob)
        : "";

      setResultUrls(urls);

      setZipUrl(generatedZipUrl);

      onResultChange?.({
        ...result,

        resultUrls: urls,

        zipUrl: generatedZipUrl,

        downloads: result.results.map((item, index) => ({
          name: item.filename,

          filename: item.filename,

          url: urls[index],
        })),
      });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : `PDF to ${config.label} conversion failed.`,
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
          title={`Choose a PDF to convert to ${config.label}`}
          description="PDF up to 30 MB. Browser mode converts up to 25 pages per run."
        />

        {isInspecting && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Reading the PDF locally..."
            />
          </div>
        )}

        {!isInspecting && error && (
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

        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
          <span>{formatBytes(file.size)}</span>

          <span>{pdfInfo?.pageCount} pages</span>
        </div>

        {pdfInfo?.pageCount > MAX_RENDER_PAGES && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Large PDF detected. Browser conversion is limited to{" "}
            {MAX_RENDER_PAGES} pages per run. You can convert another range
            afterward.
          </div>
        )}

        <button
          type="button"
          onClick={handleRemoveFile}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold text-foreground"
        >
          Choose another PDF
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Pages to convert</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Use <strong>all</strong> or ranges such as <strong>1-3,5,8</strong>.
        </p>

        <input
          type="text"
          value={pageSelection}
          onChange={(event) => {
            setPageSelection(event.target.value);

            clearResult();
          }}
          placeholder="all or 1-3,5"
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none focus:border-primary"
        />

        {selectionState.error ? (
          <p className="mt-3 text-sm font-medium text-red-600">
            {selectionState.error}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            {selectionState.pages.length} page
            {selectionState.pages.length === 1 ? "" : "s"} selected
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Render quality</p>

        <p className="mt-1 text-sm text-muted">
          Higher scale creates sharper images but uses more memory.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {SCALE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setScale(option.value);

                clearResult();
              }}
              className={`min-h-16 rounded-xl border px-3 py-2 text-left transition ${
                scale === option.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">
                {option.label}
              </p>

              <p className="mt-1 text-xs text-muted">{option.detail}</p>
            </button>
          ))}
        </div>

        {format === "jpg" && (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  JPG quality
                </p>

                <p className="mt-1 text-xs text-muted">
                  Lower quality creates smaller files.
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
        )}

        <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
          Pages are rendered sequentially instead of all at once to reduce
          browser memory pressure.
        </div>
      </div>

      <button
        type="button"
        onClick={handleConvert}
        disabled={
          isProcessing ||
          Boolean(selectionState.error) ||
          selectionState.pages.length === 0
        }
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isProcessing
          ? `Converting to ${config.label}...`
          : `Convert ${selectionState.pages.length || ""} Page${
              selectionState.pages.length === 1 ? "" : "s"
            } to ${config.label}`}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        PDF rendering runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message={`Rendering PDF pages as ${config.label} images locally...`}
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isProcessing && resultUrls.length > 0 && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message={`${resultUrls.length} page${resultUrls.length === 1 ? "" : "s"} converted successfully.`}
          />
        </div>
      )}
    </div>
  );
}
