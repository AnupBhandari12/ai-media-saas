"use client";

import { useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import {
  extractPdfPages,
  inspectPdfForManipulation,
} from "@/lib/tools/pdf/manipulatePdf";

import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const MAX_EXTRACT_PAGES = 100;

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

function outputFilename(file) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  return `${base}-extracted.pdf`;
}

export default function ExtractPdfTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [selection, setSelection] = useState("");

  const [isInspecting, setIsInspecting] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  const selectionState = useMemo(() => {
    if (!pdfInfo || !selection.trim()) {
      return {
        pages: [],
        error: "",
      };
    }

    try {
      return {
        pages: parsePageSelection(
          selection,
          pdfInfo.pageCount,
          MAX_EXTRACT_PAGES,
        ),

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
  }, [selection, pdfInfo]);

  function clearResult() {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setResultUrl("");

    setError("");

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

      clearResult();

      const info = await inspectPdfForManipulation(selectedFile);

      setFile(selectedFile);

      setPdfInfo(info);

      setSelection(
        info.pageCount <= MAX_EXTRACT_PAGES ? "all" : `1-${MAX_EXTRACT_PAGES}`,
      );
    } catch (inspectError) {
      setFile(null);

      setPdfInfo(null);

      setError(
        inspectError instanceof Error
          ? inspectError.message
          : "The PDF could not be read.",
      );
    } finally {
      setIsInspecting(false);
    }
  }

  function handleRemoveFile() {
    setFile(null);

    setPdfInfo(null);

    setSelection("");

    clearResult();
  }

  async function handleExtract() {
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

      clearResult();

      const result = await extractPdfPages(file, selection);

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
          : "Page extraction failed.",
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
          description="Extract selected pages into one new PDF."
        />

        {isInspecting && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Reading PDF locally..."
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

        <p className="mt-2 text-sm text-muted">
          {formatBytes(file.size)} · {pdfInfo.pageCount} pages
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
        <p className="font-semibold text-foreground">Pages to keep</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Use <strong>all</strong> or enter pages like <strong>2,5,9</strong> or{" "}
          <strong>1-3,7,10</strong>.
        </p>

        <input
          type="text"
          value={selection}
          onChange={(event) => {
            setSelection(event.target.value);

            clearResult();
          }}
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
        />

        {selectionState.error ? (
          <p className="mt-3 text-sm font-medium text-red-600">
            {selectionState.error}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            {selectionState.pages.length} page
            {selectionState.pages.length === 1 ? "" : "s"} will be kept.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleExtract}
        disabled={
          isProcessing ||
          Boolean(selectionState.error) ||
          selectionState.pages.length === 0
        }
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Extracting..." : "Extract Pages"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Extraction runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating a new PDF from the selected pages..."
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
            message="Selected pages extracted successfully."
          />
        </div>
      )}
    </div>
  );
}
