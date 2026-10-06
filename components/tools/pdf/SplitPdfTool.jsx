"use client";

import { useEffect, useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import {
  inspectPdfForManipulation,
  splitPdfByRanges,
} from "@/lib/tools/pdf/manipulatePdf";

import { parseSplitRanges } from "@/lib/tools/pdf/splitRanges";

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

function isPdfFile(file) {
  return (
    file?.type === "application/pdf" ||
    file?.name?.toLowerCase().endsWith(".pdf")
  );
}

export default function SplitPdfTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [ranges, setRanges] = useState("");

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

  const rangeState = useMemo(() => {
    if (!pdfInfo || !ranges.trim()) {
      return {
        groups: [],
        error: "",
      };
    }

    try {
      return {
        groups: parseSplitRanges(ranges, pdfInfo.pageCount),

        error: "",
      };
    } catch (rangeError) {
      return {
        groups: [],

        error:
          rangeError instanceof Error ? rangeError.message : "Invalid ranges.",
      };
    }
  }, [ranges, pdfInfo]);

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

      clearResult();

      const info = await inspectPdfForManipulation(selectedFile);

      setFile(selectedFile);

      setPdfInfo(info);

      setRanges("");
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

    setRanges("");

    clearResult();
  }

  async function handleSplit() {
    if (
      !file ||
      !pdfInfo ||
      rangeState.error ||
      rangeState.groups.length === 0 ||
      isProcessing
    ) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const output = await splitPdfByRanges(file, ranges);

      const urls = output.results.map((result) =>
        URL.createObjectURL(result.blob),
      );

      const generatedZipUrl = output.zipBlob
        ? URL.createObjectURL(output.zipBlob)
        : "";

      setResultUrls(urls);

      setZipUrl(generatedZipUrl);

      onResultChange?.({
        ...output,

        resultUrls: urls,

        zipUrl: generatedZipUrl,

        downloads: output.results.map((result, index) => ({
          name: result.filename,

          filename: result.filename,

          url: urls[index],
        })),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "PDF split failed.",
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
          title="Choose a PDF to split"
          description="PDF up to 30 MB."
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

        <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
          <span>{formatBytes(file.size)}</span>

          <span>{pdfInfo.pageCount} pages</span>
        </div>

        <button
          type="button"
          onClick={handleRemoveFile}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
        >
          Choose another PDF
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Split ranges</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Each comma-separated item creates a separate PDF. Example:{" "}
          <strong>1-3,4-8,9</strong>
        </p>

        <input
          type="text"
          value={ranges}
          onChange={(event) => {
            setRanges(event.target.value);

            clearResult();
          }}
          placeholder="1-3,4-8,9"
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm outline-none focus:border-primary"
        />

        {rangeState.error ? (
          <p className="mt-3 text-sm font-medium text-red-600">
            {rangeState.error}
          </p>
        ) : (
          rangeState.groups.length > 0 && (
            <div className="mt-4 space-y-2">
              {rangeState.groups.map((group, index) => (
                <div
                  key={`${group.label}-${index}`}
                  className="rounded-xl border border-border bg-surface p-3 text-sm"
                >
                  <span className="font-semibold text-foreground">
                    Output {index + 1}
                  </span>

                  <span className="ml-2 text-muted">
                    Pages {group.label} ({group.pages.length} pages)
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <button
        type="button"
        onClick={handleSplit}
        disabled={
          isProcessing ||
          Boolean(rangeState.error) ||
          rangeState.groups.length === 0
        }
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Splitting PDF..."
          : `Create ${rangeState.groups.length || ""} PDF${
              rangeState.groups.length === 1 ? "" : "s"
            }`}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Splitting runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating split PDFs locally..."
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
            message={`${resultUrls.length} split PDF${resultUrls.length === 1 ? "" : "s"} created successfully.`}
          />
        </div>
      )}
    </div>
  );
}
