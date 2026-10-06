"use client";

import Image from "next/image";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { imagePresets } from "@/lib/presets";

import { BATCH_ITEM_STATUS } from "@/lib/tools/batch/status";

import { createSocialMediaPack } from "@/lib/tools/creator/createSocialMediaPack";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

export default function SocialMediaPackTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [selectedIds, setSelectedIds] = useState(
    imagePresets.slice(0, 5).map((preset) => preset.id),
  );

  const [focusX, setFocusX] = useState(50);

  const [focusY, setFocusY] = useState(50);

  const [quality, setQuality] = useState(90);

  const [itemStates, setItemStates] = useState([]);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrls, setResultUrls] = useState([]);

  const [zipUrl, setZipUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  function handleFilesSelected(files) {
    const selectedFile = files[0];

    if (!selectedFile) {
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selectedFile.type)
    ) {
      setError("Choose a JPG, PNG, or WebP image.");

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Image must be 15 MB or smaller.");

      return;
    }

    setFile(selectedFile);

    setPreviewUrl(URL.createObjectURL(selectedFile));

    clearResult();
  }

  function togglePreset(presetId) {
    setSelectedIds((current) =>
      current.includes(presetId)
        ? current.filter((id) => id !== presetId)
        : current.length < 8
          ? [...current, presetId]
          : current,
    );

    clearResult();
  }

  function updateItemState(nextItem) {
    setItemStates((current) => {
      const exists = current.some(
        (item) => item.presetId === nextItem.presetId,
      );

      if (!exists) {
        return [...current, nextItem];
      }

      return current.map((item) =>
        item.presetId === nextItem.presetId ? nextItem : item,
      );
    });
  }

  async function handleGenerate(onlyPresetIds = null) {
    if (!file || isProcessing) {
      return;
    }

    const presetsToRun = onlyPresetIds || selectedIds;

    if (presetsToRun.length === 0) {
      setError("Select at least one output.");

      return;
    }

    try {
      setIsProcessing(true);

      setError("");
      setItemStates([]);
      setResultUrls([]);
      setZipUrl("");

      onResultChange?.(null);

      const output = await createSocialMediaPack(file, {
        presetIds: presetsToRun,

        focusX,
        focusY,

        qualityPercent: quality,

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
          : "Social media pack generation failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const failedIds = itemStates
    .filter((item) => item.status === BATCH_ITEM_STATUS.ERROR)
    .map((item) => item.presetId);

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Upload one image"
          description="Use one JPG, PNG, or WebP image to create multiple social and web sizes."
        />

        {error && (
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
        <p className="font-semibold text-foreground">Source image</p>

        <div className="relative mt-4 aspect-video overflow-hidden rounded-xl bg-slate-100">
          <Image
            src={previewUrl}
            alt={file.name}
            fill
            unoptimized
            sizes="600px"
            className="object-contain"
          />
        </div>

        <p className="mt-3 truncate text-sm text-muted">{file.name}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Choose outputs</p>

        <p className="mt-1 text-sm text-muted">Select up to 8 sizes.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {imagePresets.map((preset) => {
            const selected = selectedIds.includes(preset.id);

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => togglePreset(preset.id)}
                className={`min-h-20 rounded-xl border p-4 text-left ${
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface"
                }`}
              >
                <p className="font-semibold text-foreground">{preset.name}</p>

                <p className="mt-1 text-xs text-muted">
                  {preset.width} × {preset.height} · {preset.aspectRatio}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Crop focus</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Move the shared focus point toward the subject. Every selected output
          uses this focus.
        </p>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Horizontal</span>

            <span className="font-semibold text-primary">{focusX}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={focusX}
            onChange={(event) => {
              setFocusX(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Vertical</span>

            <span className="font-semibold text-primary">{focusY}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={focusY}
            onChange={(event) => {
              setFocusY(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>JPG quality</span>

            <span className="font-semibold text-primary">{quality}%</span>
          </div>

          <input
            type="range"
            min="65"
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
      </div>

      {itemStates.length > 0 && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Output progress</p>

          <div className="mt-4 space-y-2">
            {itemStates.map((item) => (
              <div
                key={item.presetId}
                className="rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {item.width} × {item.height}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold ${
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

                {item.error && (
                  <p className="mt-2 text-xs text-red-600">{item.error}</p>
                )}
              </div>
            ))}
          </div>

          {failedIds.length > 0 && (
            <button
              type="button"
              onClick={() => handleGenerate(failedIds)}
              disabled={isProcessing}
              className="mt-4 min-h-11 w-full rounded-xl border border-primary px-4 text-sm font-semibold text-primary"
            >
              Retry Failed Outputs
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => handleGenerate()}
        disabled={selectedIds.length === 0 || isProcessing}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Creating Pack..."
          : `Create ${selectedIds.length} Outputs`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating selected sizes one by one..."
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
            message={`${resultUrls.length} outputs created successfully.`}
          />
        </div>
      )}
    </div>
  );
}
