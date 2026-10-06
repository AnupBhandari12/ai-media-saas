"use client";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import {
  compressPdfBasic,
  PDF_COMPRESSION_PRESETS,
} from "@/lib/tools/pdf/compressPdfBasic";

import { inspectPdfForManipulation } from "@/lib/tools/pdf/manipulatePdf";

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

function outputFilename(file) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  return `${base}-compressed.pdf`;
}

export default function CompressPdfTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [preset, setPreset] = useState("BALANCED");

  const [isLoading, setIsLoading] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

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

      const info = await inspectPdfForManipulation(selectedFile);

      if (info.pageCount > 25) {
        throw new Error(
          "Browser compression currently supports up to 25 pages.",
        );
      }

      setFile(selectedFile);

      setPdfInfo(info);

      setPreset("BALANCED");
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

  function handleRemoveFile() {
    setFile(null);

    setPdfInfo(null);

    clearResult();
  }

  async function handleCompress() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await compressPdfBasic(file, {
        preset,
      });

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: result.keptOriginal ? file.name : outputFilename(file),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "PDF compression failed.",
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
          title="Choose a PDF to compress"
          description="Best for scanned or image-heavy PDFs. Up to 30 MB and 25 pages."
        />

        {isLoading && (
          <div className="mt-4">
            <ProgressPanel
              status="PROCESSING"
              showProgress={false}
              message="Inspecting PDF locally..."
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
        <p className="font-semibold text-foreground">Compression level</p>

        <div className="mt-4 grid gap-3">
          {Object.entries(PDF_COMPRESSION_PRESETS).map(([value, settings]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPreset(value);

                clearResult();
              }}
              className={`min-h-16 rounded-xl border p-4 text-left ${
                preset === value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold text-foreground">{settings.label}</p>

              <p className="mt-1 text-xs leading-5 text-muted">
                {value === "SMALL"
                  ? "Stronger raster compression for smaller screen-friendly PDFs."
                  : value === "QUALITY"
                    ? "Keeps sharper page images with lighter compression."
                    : "Good balance between readability and file size."}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
          This compression rebuilds each page as an image. It is best for
          scanned PDFs. Selectable text, links, forms and other interactive
          elements may be flattened.
        </div>
      </div>

      <button
        type="button"
        onClick={handleCompress}
        disabled={isProcessing}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Compressing PDF..." : "Compress PDF"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Compression runs locally on your device.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Rendering and rebuilding PDF pages locally..."
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
          <ProgressPanel status="SUCCESS" message="PDF compression finished." />
        </div>
      )}
    </div>
  );
}
