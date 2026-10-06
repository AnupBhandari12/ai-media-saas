"use client";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { convertTiffImage } from "@/lib/tools/image/convertTiffImage";

const MAX_FILE_SIZE = 25 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isTiffFile(file) {
  const name = file.name.toLowerCase();

  return name.endsWith(".tif") || name.endsWith(".tiff");
}

export default function TiffConverterTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [outputMimeType, setOutputMimeType] = useState("image/png");

  const [quality, setQuality] = useState(90);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [pageUrls, setPageUrls] = useState([]);

  const [zipUrl, setZipUrl] = useState("");

  useEffect(() => {
    return () => {
      for (const url of pageUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [pageUrls]);

  useEffect(() => {
    return () => {
      if (zipUrl) {
        URL.revokeObjectURL(zipUrl);
      }
    };
  }, [zipUrl]);

  function clearResult() {
    setError("");
    setPageUrls([]);
    setZipUrl("");

    onResultChange?.(null);
  }

  function handleFilesSelected(files) {
    const selectedFile = files[0];

    if (!selectedFile) {
      return;
    }

    if (!isTiffFile(selectedFile)) {
      setError("Please choose a .tif or .tiff file.");

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("TIFF file must be 25 MB or smaller for browser processing.");

      return;
    }

    setFile(selectedFile);

    setOutputMimeType("image/png");

    setQuality(90);

    clearResult();
  }

  function handleRemoveFile() {
    setFile(null);
    clearResult();
  }

  async function handleConvert() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setPageUrls([]);
      setZipUrl("");

      onResultChange?.(null);

      const result = await convertTiffImage(file, {
        outputMimeType,
        qualityPercent: quality,
      });

      const urls = result.pages.map((page) => URL.createObjectURL(page.blob));

      const generatedZipUrl = result.zipBlob
        ? URL.createObjectURL(result.zipBlob)
        : "";

      setPageUrls(urls);

      setZipUrl(generatedZipUrl);

      onResultChange?.({
        ...result,

        pageUrls: urls,

        zipUrl: generatedZipUrl,

        downloads: result.pages.map((page, index) => ({
          name: page.filename,

          filename: page.filename,

          url: urls[index],
        })),
      });
    } catch (conversionError) {
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "TIFF conversion failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept=".tif,.tiff,image/tiff"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose a TIFF image"
          description="TIF or TIFF up to 25 MB. Multi-page TIFF supports up to 10 pages in browser mode."
        />

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="truncate font-semibold text-foreground">{file.name}</p>

        <p className="mt-2 text-sm text-muted">{formatBytes(file.size)}</p>

        <button
          type="button"
          onClick={handleRemoveFile}
          className="mt-4 min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
        >
          Choose another TIFF
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Output format</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setOutputMimeType("image/png");

              clearResult();
            }}
            className={`min-h-11 rounded-xl border font-semibold ${
              outputMimeType === "image/png"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            PNG
          </button>

          <button
            type="button"
            onClick={() => {
              setOutputMimeType("image/jpeg");

              clearResult();
            }}
            className={`min-h-11 rounded-xl border font-semibold ${
              outputMimeType === "image/jpeg"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            JPG
          </button>
        </div>

        {outputMimeType === "image/jpeg" && (
          <div className="mt-6">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-foreground">JPG quality</span>

              <span className="font-semibold text-primary">{quality}%</span>
            </div>

            <input
              type="range"
              min="40"
              max="95"
              step="5"
              value={quality}
              onChange={(event) => {
                setQuality(Number(event.target.value));

                clearResult();
              }}
              className="mt-3 w-full accent-indigo-600"
            />
          </div>
        )}

        <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
          Normal TIFF files are decoded locally. Files with very large pages or
          more than 10 pages are rejected instead of risking browser memory
          exhaustion.
        </div>
      </div>

      <button
        type="button"
        onClick={handleConvert}
        disabled={isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Converting..." : "Convert TIFF"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Decoding and converting TIFF pages locally..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isProcessing && pageUrls.length > 0 && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message={`${pageUrls.length} TIFF page${pageUrls.length === 1 ? "" : "s"} converted successfully.`}
          />
        </div>
      )}
    </div>
  );
}
