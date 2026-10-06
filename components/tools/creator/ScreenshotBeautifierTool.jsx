"use client";

import Image from "next/image";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import {
  SCREENSHOT_FRAMES,
  SCREENSHOT_PADDING_OPTIONS,
  SCREENSHOT_THEMES,
} from "@/lib/tools/creator/screenshotBeautifier";

import { createBeautifiedScreenshot } from "@/lib/tools/creator/createBeautifiedScreenshot";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const DEFAULT_SETTINGS = {
  theme: "INDIGO",
  frame: "CARD",
  padding: 96,

  cornerRadius: 24,
  shadowStrength: 65,

  backgroundAngle: 135,

  outputFormat: "png",
};

export default function ScreenshotBeautifierTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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
      setError("Choose a JPG, PNG, or WebP screenshot.");

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Screenshot must be 15 MB or smaller.");

      return;
    }

    setFile(selectedFile);

    setPreviewUrl(URL.createObjectURL(selectedFile));

    setSettings(DEFAULT_SETTINGS);

    clearResult();
  }

  async function handleCreate() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await createBeautifiedScreenshot(file, settings);

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
          : "Screenshot beautification failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const theme =
    SCREENSHOT_THEMES.find((item) => item.id === settings.theme) ||
    SCREENSHOT_THEMES[0];

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose a screenshot"
          description="JPG, PNG, or WebP up to 15 MB. Original screenshot pixels are preserved."
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
            <p className="font-semibold text-foreground">Preview</p>

            <p className="mt-1 text-sm text-muted">
              Original screenshot is kept at native resolution.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFile(null);
              setPreviewUrl("");
              clearResult();
            }}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
          >
            Change
          </button>
        </div>

        <div
          className="mt-5 overflow-hidden rounded-2xl p-6 sm:p-10"
          style={{
            background: `linear-gradient(${settings.backgroundAngle}deg, ${theme.start}, ${theme.end})`,
          }}
        >
          <div
            className={
              settings.frame === "NONE"
                ? ""
                : "overflow-hidden bg-white shadow-2xl"
            }
            style={{
              borderRadius:
                settings.frame === "NONE"
                  ? 0
                  : `${Math.min(24, settings.cornerRadius)}px`,
            }}
          >
            {settings.frame === "BROWSER" && (
              <div className="flex h-9 items-center gap-2 bg-slate-100 px-3">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

                <div className="ml-2 h-5 flex-1 rounded-full bg-slate-200" />
              </div>
            )}

            <Image
              src={previewUrl}
              alt="Screenshot preview"
              width={1200}
              height={800}
              unoptimized
              sizes="700px"
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Background theme</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SCREENSHOT_THEMES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateSetting("theme", item.id)}
              className={`rounded-xl border p-3 text-left ${
                settings.theme === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <div
                className="h-14 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${item.start}, ${item.end})`,
                }}
              />

              <p className="mt-2 text-sm font-semibold text-foreground">
                {item.name}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Gradient angle</span>

            <span className="font-semibold text-primary">
              {settings.backgroundAngle}°
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="360"
            step="15"
            value={settings.backgroundAngle}
            onChange={(event) =>
              updateSetting("backgroundAngle", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Frame</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {SCREENSHOT_FRAMES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateSetting("frame", item.id)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                settings.frame === item.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {settings.frame !== "NONE" && (
          <>
            <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span>Corner radius</span>

                <span className="font-semibold text-primary">
                  {settings.cornerRadius}
                  px
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="48"
                step="4"
                value={settings.cornerRadius}
                onChange={(event) =>
                  updateSetting("cornerRadius", Number(event.target.value))
                }
                className="mt-3 w-full accent-indigo-600"
              />
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-sm">
                <span>Shadow</span>

                <span className="font-semibold text-primary">
                  {settings.shadowStrength}%
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.shadowStrength}
                onChange={(event) =>
                  updateSetting("shadowStrength", Number(event.target.value))
                }
                className="mt-3 w-full accent-indigo-600"
              />
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Padding</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {SCREENSHOT_PADDING_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => updateSetting("padding", item.value)}
              className={`min-h-11 rounded-xl border text-sm font-semibold ${
                settings.padding === item.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Export format</p>

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

        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
          Screenshot content is not resized during export. Padding and framing
          are added around the original pixels.
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={isProcessing}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Beautifying Screenshot..."
          : "Create Beautified Screenshot"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Composing the screenshot at native resolution..."
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
            message="Beautified screenshot created successfully."
          />
        </div>
      )}
    </div>
  );
}
