"use client";

import { useEffect, useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { inspectPdfForManipulation } from "@/lib/tools/pdf/manipulatePdf";
import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";
import { addPdfPageNumbers } from "@/lib/tools/pdf/enhancePdf";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const MAX_PAGES_PER_RUN = 100;

const POSITIONS = [
  ["TOP_LEFT", "Top Left"],
  ["TOP_CENTER", "Top Center"],
  ["TOP_RIGHT", "Top Right"],
  ["BOTTOM_LEFT", "Bottom Left"],
  ["BOTTOM_CENTER", "Bottom Center"],
  ["BOTTOM_RIGHT", "Bottom Right"],
];

function outputFilename(file) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  return `${base}-numbered.pdf`;
}

export default function PageNumbersPdfTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [selection, setSelection] = useState("all");

  const [startNumber, setStartNumber] = useState(1);

  const [prefix, setPrefix] = useState("");

  const [position, setPosition] = useState("BOTTOM_CENTER");

  const [fontSize, setFontSize] = useState(12);

  const [margin, setMargin] = useState(24);

  const [color, setColor] = useState("#111827");

  const [isLoading, setIsLoading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [resultUrl, setResultUrl] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  const selectionState = useMemo(() => {
    if (!pdfInfo) {
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
          MAX_PAGES_PER_RUN,
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

      const info = await inspectPdfForManipulation(selectedFile);

      setFile(selectedFile);

      setPdfInfo(info);

      setSelection(
        info.pageCount > MAX_PAGES_PER_RUN ? `1-${MAX_PAGES_PER_RUN}` : "all",
      );
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

  async function handleProcess() {
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

      const result = await addPdfPageNumbers(file, {
        pageSelection: selection,

        startNumber,
        prefix,
        position,
        fontSize,
        margin,
        colorHex: color,
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
          : "Could not add page numbers.",
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
          description="Add page numbers locally without uploading the document."
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
        <p className="font-semibold text-foreground">{file.name}</p>

        <p className="mt-2 text-sm text-muted">{pdfInfo.pageCount} pages</p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Pages</p>

        <input
          type="text"
          value={selection}
          onChange={(event) => {
            setSelection(event.target.value);

            clearResult();
          }}
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
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
        <p className="font-semibold text-foreground">Number style</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Start number
            <input
              type="number"
              min="0"
              value={startNumber}
              onChange={(event) => {
                setStartNumber(Number(event.target.value));

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3"
            />
          </label>

          <label className="text-sm font-semibold">
            Prefix
            <input
              type="text"
              value={prefix}
              maxLength={30}
              placeholder="Page "
              onChange={(event) => {
                setPrefix(event.target.value);

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3"
            />
          </label>

          <label className="text-sm font-semibold">
            Font size
            <input
              type="number"
              min="8"
              max="36"
              value={fontSize}
              onChange={(event) => {
                setFontSize(Number(event.target.value));

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3"
            />
          </label>

          <label className="text-sm font-semibold">
            Margin
            <input
              type="number"
              min="8"
              max="72"
              value={margin}
              onChange={(event) => {
                setMargin(Number(event.target.value));

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3"
            />
          </label>

          <label className="text-sm font-semibold">
            Color
            <input
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value);

                clearResult();
              }}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-surface p-1"
            />
          </label>
        </div>

        <p className="mt-6 text-sm font-semibold">Position</p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {POSITIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPosition(value);

                clearResult();
              }}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                position === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={
          isProcessing ||
          Boolean(selectionState.error) ||
          selectionState.pages.length === 0
        }
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Adding Numbers..." : "Add Page Numbers"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Adding page numbers locally..."
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
            message="Page numbers added successfully."
          />
        </div>
      )}
    </div>
  );
}
