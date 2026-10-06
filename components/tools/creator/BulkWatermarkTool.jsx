"use client";

import { useEffect, useState } from "react";

import { ImageIcon, RotateCcw } from "lucide-react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { BATCH_ITEM_STATUS } from "@/lib/tools/batch/status";

import {
  BULK_WATERMARK_POSITIONS,
  brandPositionToBulk,
  bulkWatermarkImages,
} from "@/lib/tools/creator/bulkWatermark";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const MAX_FILES = 12;

const MAX_TOTAL_SIZE = 60 * 1024 * 1024;

const DEFAULT_SETTINGS = {
  type: "text",

  text: "AI Media",

  position: "bottom-right",

  opacity: 25,

  sizePercent: 20,

  color: "#ffffff",
};

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BulkWatermarkTool({ onResultChange }) {
  const [items, setItems] = useState([]);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [brandKit, setBrandKit] = useState(null);

  const [brandKitLoading, setBrandKitLoading] = useState(true);

  const [watermarkFile, setWatermarkFile] = useState(null);

  const [itemStates, setItemStates] = useState([]);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrls, setResultUrls] = useState([]);

  const [zipUrl, setZipUrl] = useState("");

  useEffect(() => {
    async function loadBrandKit() {
      try {
        const response = await fetch("/api/brand-kit");

        const data = await response.json();

        if (response.ok && data.brandKit) {
          setBrandKit(data.brandKit);
        }
      } catch {
        // Brand Kit is optional.
      } finally {
        setBrandKitLoading(false);
      }
    }

    loadBrandKit();
  }, []);

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

  function clearResult() {
    setError("");
    setItemStates([]);
    setResultUrls([]);
    setZipUrl("");

    onResultChange?.(null);
  }

  function updateSetting(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    clearResult();
  }

  function handleFilesSelected(files) {
    if (files.length < 2) {
      setError("Choose at least 2 images for Bulk Watermark.");

      return;
    }

    if (files.length > MAX_FILES) {
      setError(`Choose up to ${MAX_FILES} images.`);

      return;
    }

    const invalid = files.find(
      (file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type),
    );

    if (invalid) {
      setError(`"${invalid.name}" must be JPG, PNG, or WebP.`);

      return;
    }

    const oversized = files.find((file) => file.size > MAX_FILE_SIZE);

    if (oversized) {
      setError(`"${oversized.name}" must be 10 MB or smaller.`);

      return;
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    if (totalSize > MAX_TOTAL_SIZE) {
      setError("Combined image size must be 60 MB or smaller.");

      return;
    }

    const nextItems = files.map((file, index) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${index}`,

      file,
    }));

    setItems(nextItems);

    clearResult();
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));

    clearResult();
  }

  function handleCustomLogo(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setWatermarkFile(null);

      clearResult();

      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Watermark logo must be JPG, PNG, or WebP.");

      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Watermark logo must be 5 MB or smaller.");

      return;
    }

    setWatermarkFile(file);

    clearResult();
  }

  function applyBrandKitDefaults() {
    if (!brandKit) {
      return;
    }

    const type = brandKit.defaultWatermarkType === "LOGO" ? "logo" : "text";

    setSettings({
      type,

      text: brandKit.defaultWatermarkText || brandKit.brandName || "AI Media",

      position: brandPositionToBulk(brandKit.defaultWatermarkPosition),

      opacity: brandKit.defaultWatermarkOpacity,

      sizePercent: brandKit.defaultWatermarkSize,

      color: "#ffffff",
    });

    setWatermarkFile(null);

    clearResult();
  }

  function updateItemState(nextItem) {
    setItemStates((current) => {
      const exists = current.some((item) => item.id === nextItem.id);

      if (!exists) {
        return [...current, nextItem];
      }

      return current.map((item) => (item.id === nextItem.id ? nextItem : item));
    });
  }

  async function handleProcess() {
    if (items.length < 2 || isProcessing) {
      return;
    }

    if (settings.type === "text" && !settings.text.trim()) {
      setError("Enter watermark text.");

      return;
    }

    const savedLogoUrl =
      settings.type === "logo" ? brandKit?.logoSecureUrl || "" : "";

    if (settings.type === "logo" && !watermarkFile && !savedLogoUrl) {
      setError("Choose a custom logo or save a logo in Brand Kit.");

      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setItemStates([]);
      setResultUrls([]);
      setZipUrl("");

      onResultChange?.(null);

      const output = await bulkWatermarkImages(items, {
        settings,

        watermarkFile,

        watermarkUrl: watermarkFile ? "" : savedLogoUrl,

        onItemUpdate: updateItemState,
      });

      const urls = output.successfulResults.map((result) =>
        URL.createObjectURL(result.blob),
      );

      const generatedZipUrl = URL.createObjectURL(output.zipBlob);

      setResultUrls(urls);

      setZipUrl(generatedZipUrl);

      onResultChange?.({
        ...output,

        zipUrl: generatedZipUrl,

        downloads: output.successfulResults.map((result, index) => ({
          name: result.filename,

          filename: result.filename,

          url: urls[index],
        })),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Bulk watermark processing failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <div>
      {items.length === 0 ? (
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          multiple
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose images to watermark"
          description="Choose 2–12 JPG, PNG, or WebP images. Maximum 10 MB each and 60 MB combined."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Selected images</p>

              <p className="mt-1 text-sm text-muted">
                {items.length} files · {formatBytes(totalSize)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setItems([]);
                clearResult();
              }}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
            >
              Change Files
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImageIcon size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {item.file.name}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {formatBytes(item.file.size)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {items.length < 2 && (
            <p className="mt-4 text-sm font-medium text-amber-700">
              Keep at least 2 images before processing.
            </p>
          )}
        </div>
      )}

      {!brandKitLoading && brandKit && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Brand Kit</p>

          <p className="mt-1 text-sm leading-6 text-muted">
            Load your saved watermark defaults with one click.
          </p>

          <button
            type="button"
            onClick={applyBrandKitDefaults}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary px-4 text-sm font-semibold text-primary"
          >
            <RotateCcw size={17} />
            Load Brand Kit Defaults
          </button>

          <p className="mt-3 text-xs text-muted">
            {brandKit.brandName || "Saved Brand Kit"} ·{" "}
            {brandKit.defaultWatermarkType} ·{" "}
            {brandKit.defaultWatermarkPosition}
          </p>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Watermark</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateSetting("type", "text")}
            className={`min-h-11 rounded-xl border font-semibold ${
              settings.type === "text"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Text
          </button>

          <button
            type="button"
            onClick={() => updateSetting("type", "logo")}
            className={`min-h-11 rounded-xl border font-semibold ${
              settings.type === "logo"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Logo
          </button>
        </div>

        {settings.type === "text" ? (
          <>
            <label className="mt-5 block text-sm font-semibold">
              Watermark text
              <input
                type="text"
                maxLength={100}
                value={settings.text}
                onChange={(event) => updateSetting("text", event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Text color
              <input
                type="color"
                value={settings.color}
                onChange={(event) => updateSetting("color", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border p-1"
              />
            </label>
          </>
        ) : (
          <div className="mt-5">
            {brandKit?.logoSecureUrl && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                Saved Brand Kit logo is available. Leave custom logo empty to
                use it.
              </div>
            )}

            <label className="text-sm font-semibold">
              Custom logo (optional)
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCustomLogo}
                className="mt-2 block w-full rounded-xl border border-border bg-surface p-3 text-sm"
              />
            </label>

            {watermarkFile && (
              <p className="mt-2 truncate text-xs text-muted">
                Custom: {watermarkFile.name}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Position</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BULK_WATERMARK_POSITIONS.map((position) => (
            <button
              key={position.value}
              type="button"
              onClick={() => updateSetting("position", position.value)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                settings.position === position.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {position.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span>Opacity</span>

            <span className="font-semibold text-primary">
              {settings.opacity}%
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={settings.opacity}
            onChange={(event) =>
              updateSetting("opacity", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span>Size</span>

            <span className="font-semibold text-primary">
              {settings.sizePercent}%
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="70"
            step="5"
            value={settings.sizePercent}
            onChange={(event) =>
              updateSetting("sizePercent", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>
      </div>

      {itemStates.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Processing results</p>

          <div className="mt-4 space-y-2">
            {itemStates.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {item.originalName}
                  </p>

                  {item.error && (
                    <p className="mt-1 text-xs text-red-600">{item.error}</p>
                  )}
                </div>

                <span
                  className={`shrink-0 text-xs font-semibold ${
                    item.status === BATCH_ITEM_STATUS.SUCCESS
                      ? "text-emerald-600"
                      : item.status === BATCH_ITEM_STATUS.ERROR
                        ? "text-red-600"
                        : "text-primary"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleProcess}
        disabled={items.length < 2 || isProcessing}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Watermarking Images..."
          : `Watermark ${items.length} Images`}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Images are processed sequentially in your browser to keep memory use
        bounded.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Applying watermark to every selected image..."
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
            message={`${resultUrls.length} images processed successfully.`}
          />
        </div>
      )}
    </div>
  );
}
