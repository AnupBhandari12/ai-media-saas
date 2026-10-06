"use client";

import { useEffect, useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { inspectPdfForManipulation } from "@/lib/tools/pdf/manipulatePdf";
import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";
import { extractPdfText } from "@/lib/tools/pdf/extractPdfText";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const MAX_PAGES = 100;

function outputFilename(file) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  return `${base}-text.txt`;
}

export default function PdfTextExtractorTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [selection, setSelection] = useState("all");

  const [isLoading, setIsLoading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [textUrl, setTextUrl] = useState("");

  useEffect(() => {
    return () => {
      if (textUrl) {
        URL.revokeObjectURL(textUrl);
      }
    };
  }, [textUrl]);

  const selectionState = useMemo(() => {
    if (!pdfInfo) {
      return {
        pages: [],
        error: "",
      };
    }

    try {
      return {
        pages: parsePageSelection(selection, pdfInfo.pageCount, MAX_PAGES),

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
    setError("");
    setTextUrl("");

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

      const info = await inspectPdfForManipulation(selectedFile);

      setFile(selectedFile);

      setPdfInfo(info);

      setSelection(info.pageCount > MAX_PAGES ? `1-${MAX_PAGES}` : "all");
    } catch (loadError) {
      setFile(null);

      setPdfInfo(null);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "The PDF could not be read.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExtract() {
    if (
      !file ||
      selectionState.error ||
      selectionState.pages.length === 0 ||
      isProcessing
    ) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await extractPdfText(file, {
        pageSelection: selection,
      });

      const blob = new Blob([result.text], {
        type: "text/plain;charset=utf-8",
      });

      const objectUrl = URL.createObjectURL(blob);

      setTextUrl(objectUrl);

      onResultChange?.({
        ...result,

        textUrl: objectUrl,

        filename: outputFilename(file),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Text extraction failed.",
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
          title="Choose a PDF with selectable text"
          description="Fast local text extraction without OCR."
        />

        {isLoading && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Reading PDF locally..."
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

        <p className="mt-2 text-sm text-muted">{pdfInfo.pageCount} pages</p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Pages to extract</p>

        <p className="mt-1 text-sm text-muted">
          Use all or ranges like 1-5,8,10.
        </p>

        <input
          type="text"
          value={selection}
          onChange={(event) => {
            setSelection(event.target.value);

            clearResult();
          }}
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
        />

        {selectionState.error ? (
          <p className="mt-3 text-sm text-red-600">{selectionState.error}</p>
        ) : (
          <p className="mt-3 text-sm text-muted">
            {selectionState.pages.length} pages selected
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
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Extracting Text..." : "Extract Text"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        No OCR is used. Text extraction runs locally.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Extracting selectable PDF text..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isProcessing && textUrl && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message="PDF text extracted successfully."
          />
        </div>
      )}
    </div>
  );
}
