"use client";

import { useEffect, useRef, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { createMeme, renderMemePreview } from "@/lib/tools/creator/memeMaker";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const DEFAULT_SETTINGS = {
  topText: "WHEN THE CODE",

  bottomText: "WORKS ON THE FIRST TRY",

  customText: "",

  customY: 50,

  fontScale: 7,

  textColor: "#ffffff",

  outlineColor: "#000000",

  uppercase: true,

  outputFormat: "png",
};

export default function MemeMakerTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!file || !canvasRef.current) {
      return;
    }

    let active = true;

    async function drawPreview() {
      try {
        if (!active || !canvasRef.current) {
          return;
        }

        await renderMemePreview(canvasRef.current, file, settings);
      } catch {
        // Final export reports actionable errors.
      }
    }

    drawPreview();

    return () => {
      active = false;
    };
  }, [file, settings]);

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

  function updateSetting(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    clearResult();
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

    setSettings(DEFAULT_SETTINGS);

    clearResult();
  }

  async function handleCreate() {
    if (!file || isProcessing) {
      return;
    }

    const hasText =
      settings.topText.trim() ||
      settings.bottomText.trim() ||
      settings.customText.trim();

    if (!hasText) {
      setError("Add at least one meme text.");

      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await createMeme(file, settings);

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: result.filename,
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Meme generation failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose meme image"
          description="JPG, PNG, or WebP up to 15 MB."
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Live preview</p>

            <p className="mt-1 text-sm text-muted">
              Preview uses the same canvas renderer as the final export.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFile(null);
              clearResult();
            }}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
          >
            Change
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-xl bg-slate-950">
          <canvas
            ref={canvasRef}
            className="h-auto max-h-600px w-full object-contain"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Meme text</p>

        <label className="mt-4 block text-sm font-semibold">
          Top text
          <textarea
            rows={2}
            maxLength={120}
            value={settings.topText}
            onChange={(event) => updateSetting("topText", event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Bottom text
          <textarea
            rows={2}
            maxLength={120}
            value={settings.bottomText}
            onChange={(event) =>
              updateSetting("bottomText", event.target.value)
            }
            className="mt-2 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Custom text
          <textarea
            rows={2}
            maxLength={120}
            value={settings.customText}
            onChange={(event) =>
              updateSetting("customText", event.target.value)
            }
            placeholder="Optional center/custom text"
            className="mt-2 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-primary"
          />
        </label>

        {settings.customText && (
          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span>Custom text position</span>

              <span className="font-semibold text-primary">
                {settings.customY}%
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="90"
              value={settings.customY}
              onChange={(event) =>
                updateSetting("customY", Number(event.target.value))
              }
              className="mt-3 w-full accent-indigo-600"
            />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Text style</p>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Text size</span>

            <span className="font-semibold text-primary">
              {settings.fontScale}%
            </span>
          </div>

          <input
            type="range"
            min="4"
            max="12"
            step="1"
            value={settings.fontScale}
            onChange={(event) =>
              updateSetting("fontScale", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Text color
            <input
              type="color"
              value={settings.textColor}
              onChange={(event) =>
                updateSetting("textColor", event.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-border p-1"
            />
          </label>

          <label className="text-sm font-semibold">
            Outline color
            <input
              type="color"
              value={settings.outlineColor}
              onChange={(event) =>
                updateSetting("outlineColor", event.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-border p-1"
            />
          </label>
        </div>

        <label className="mt-5 flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface px-4">
          <input
            type="checkbox"
            checked={settings.uppercase}
            onChange={(event) =>
              updateSetting("uppercase", event.target.checked)
            }
          />

          <span className="text-sm font-semibold">Uppercase meme text</span>
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Export</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["png", "PNG"],
            ["jpg", "JPG"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => updateSetting("outputFormat", value)}
              className={`min-h-11 rounded-xl border font-semibold ${
                settings.outputFormat === value
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
        onClick={handleCreate}
        disabled={isProcessing}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Creating Meme..." : "Create Meme"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Rendering meme locally..."
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
            message="Meme created successfully."
          />
        </div>
      )}
    </div>
  );
}
