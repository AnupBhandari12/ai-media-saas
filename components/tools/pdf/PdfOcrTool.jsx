"use client";

import { useEffect, useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { inspectPdfForManipulation } from "@/lib/tools/pdf/manipulatePdf";
import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";
import { ocrPdfToText } from "@/lib/tools/pdf/ocrPdfToText";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const MAX_OCR_PAGES = 10;

const LANGUAGES = [
  ["eng", "English"],

  ["nep", "Nepali"],

  ["eng+nep", "English + Nepali"],
];

function outputFilename(file) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  return `${base}-ocr.txt`;
}

export default function PdfOcrTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [selection, setSelection] = useState("all");

  const [language, setLanguage] = useState("eng");

  const [progressMessage, setProgressMessage] = useState("");

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
        pages: parsePageSelection(selection, pdfInfo.pageCount, MAX_OCR_PAGES),

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

      setSelection(
        info.pageCount > MAX_OCR_PAGES ? `1-${MAX_OCR_PAGES}` : "all",
      );

      setLanguage("eng");
    } catch (loadError) {
      setFile(null);

      setPdfInfo(null);

      setError(
        loadError instanceof Error
          ? loadError.message
          : "The PDF could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOcr() {
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

      setProgressMessage("Starting OCR engine...");

      const result = await ocrPdfToText(file, {
        pageSelection: selection,

        language,

        onProgress: (progress) => {
          const pageText = progress.currentPage
            ? ` · Page ${progress.currentPage}/${progress.totalPages}`
            : "";

          const percent =
            typeof progress.progress === "number" && progress.progress > 0
              ? ` · ${Math.round(progress.progress * 100)}%`
              : "";

          setProgressMessage(`${progress.stage}${pageText}${percent}`);
        },
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
          : "OCR processing failed.",
      );
    } finally {
      setIsProcessing(false);

      setProgressMessage("");
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="application/pdf,.pdf"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose a scanned PDF"
          description="OCR up to 10 pages per run and 20 MB in browser mode."
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
        <p className="font-semibold text-foreground">Pages to OCR</p>

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

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">OCR language</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {LANGUAGES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setLanguage(value);

                clearResult();
              }}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                language === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
          First OCR run for a language may take longer while the OCR language
          model loads. Scanned PDF pages are rendered and recognized locally in
          the browser.
        </div>
      </div>

      <button
        type="button"
        onClick={handleOcr}
        disabled={
          isProcessing ||
          Boolean(selectionState.error) ||
          selectionState.pages.length === 0
        }
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Running OCR..." : "Extract Text with OCR"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message={progressMessage || "Running OCR locally..."}
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
            message="OCR text extracted successfully."
          />
        </div>
      )}
    </div>
  );
}
