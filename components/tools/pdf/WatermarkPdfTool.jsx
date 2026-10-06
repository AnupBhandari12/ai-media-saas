"use client";

import { useEffect, useMemo, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { inspectPdfForManipulation } from "@/lib/tools/pdf/manipulatePdf";
import { parsePageSelection } from "@/lib/tools/pdf/pageRanges";
import { addPdfWatermark } from "@/lib/tools/pdf/enhancePdf";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const MAX_LOGO_SIZE = 5 * 1024 * 1024;

const MAX_PAGES = 100;

function outputFilename(file) {
  const dot = file.name.lastIndexOf(".");

  const base = dot > 0 ? file.name.slice(0, dot) : file.name;

  return `${base}-watermarked.pdf`;
}

export default function WatermarkPdfTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [pdfInfo, setPdfInfo] = useState(null);

  const [selection, setSelection] = useState("all");

  const [type, setType] = useState("text");

  const [text, setText] = useState("CONFIDENTIAL");

  const [logoFile, setLogoFile] = useState(null);

  const [opacity, setOpacity] = useState(25);

  const [rotation, setRotation] = useState(45);

  const [sizePercent, setSizePercent] = useState(30);

  const [color, setColor] = useState("#64748b");

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
    setResultUrl("");
    onResultChange?.(null);
  }

  async function handlePdfSelected(files) {
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
          : "The PDF could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogoSelected(files) {
    const selectedLogo = files[0];

    if (!selectedLogo) {
      return;
    }

    const valid =
      selectedLogo.type === "image/png" ||
      selectedLogo.type === "image/jpeg" ||
      /\.(png|jpe?g)$/i.test(selectedLogo.name);

    if (!valid) {
      setError("Logo must be PNG or JPG.");

      return;
    }

    if (selectedLogo.size > MAX_LOGO_SIZE) {
      setError("Logo must be 5 MB or smaller.");

      return;
    }

    setLogoFile(selectedLogo);

    clearResult();
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

    if (type === "text" && !text.trim()) {
      setError("Enter watermark text.");

      return;
    }

    if (type === "logo" && !logoFile) {
      setError("Choose a watermark logo.");

      return;
    }

    try {
      setIsProcessing(true);
      clearResult();

      const result = await addPdfWatermark(file, {
        pageSelection: selection,

        type,

        text,

        logoFile,

        opacityPercent: opacity,

        rotationDegrees: rotation,

        sizePercent,

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
          : "Could not add watermark.",
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
          onFilesSelected={handlePdfSelected}
          title="Choose a PDF"
          description="Add a text or logo watermark locally."
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
          value={selection}
          onChange={(event) => {
            setSelection(event.target.value);

            clearResult();
          }}
          className="mt-4 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
        />

        {selectionState.error && (
          <p className="mt-3 text-sm text-red-600">{selectionState.error}</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Watermark type</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["text", "Text"],
            ["logo", "Logo"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setType(value);

                clearResult();
              }}
              className={`min-h-11 rounded-xl border font-semibold ${
                type === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {type === "text" ? (
          <div className="mt-5">
            <label className="text-sm font-semibold">
              Text
              <input
                value={text}
                maxLength={100}
                onChange={(event) => {
                  setText(event.target.value);

                  clearResult();
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Color
              <input
                type="color"
                value={color}
                onChange={(event) => {
                  setColor(event.target.value);

                  clearResult();
                }}
                className="mt-2 h-11 w-full rounded-xl border border-border p-1"
              />
            </label>
          </div>
        ) : (
          <div className="mt-5">
            <FileDropzone
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              maxSizeBytes={MAX_LOGO_SIZE}
              onFilesSelected={handleLogoSelected}
              title={logoFile ? logoFile.name : "Choose watermark logo"}
              description="PNG or JPG, up to 5 MB."
            />
          </div>
        )}

        <div className="mt-6">
          <div className="flex justify-between text-sm font-semibold">
            <span>Opacity</span>

            <span>{opacity}%</span>
          </div>

          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={opacity}
            onChange={(event) => {
              setOpacity(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm font-semibold">
            <span>Size</span>

            <span>{sizePercent}%</span>
          </div>

          <input
            type="range"
            min="10"
            max="70"
            step="5"
            value={sizePercent}
            onChange={(event) => {
              setSizePercent(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <p className="mt-6 text-sm font-semibold">Rotation</p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            [-45, "-45°"],
            [0, "0°"],
            [45, "45°"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setRotation(value);

                clearResult();
              }}
              className={`min-h-11 rounded-xl border font-semibold ${
                rotation === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border"
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
          selectionState.pages.length === 0 ||
          (type === "logo" && !logoFile)
        }
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Adding Watermark..." : "Add PDF Watermark"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Adding watermark locally..."
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
            message="PDF watermark added successfully."
          />
        </div>
      )}
    </div>
  );
}
