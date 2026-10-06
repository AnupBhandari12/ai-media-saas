"use client";

import Image from "next/image";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { THUMBNAIL_TEMPLATES } from "@/lib/tools/creator/thumbnailLayout";

import { createYouTubeThumbnail } from "@/lib/tools/creator/createYouTubeThumbnail";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const DEFAULT_SETTINGS = {
  template: "BOLD_LEFT",

  title: "YOUR VIDEO TITLE",

  subtitle: "",

  focusX: 50,
  focusY: 50,

  overlayOpacity: 65,

  titleColor: "#ffffff",

  primaryColor: "#4f46e5",

  secondaryColor: "#0891b2",

  useBrandKit: true,
  showLogo: true,

  outputFormat: "jpg",
};

export default function YouTubeThumbnailTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [brandKit, setBrandKit] = useState(null);

  const [brandKitLoading, setBrandKitLoading] = useState(true);

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");

  useEffect(() => {
    async function loadBrandKit() {
      try {
        const response = await fetch("/api/brand-kit");

        const data = await response.json();

        if (response.ok && data.brandKit) {
          setBrandKit(data.brandKit);

          setSettings((current) => ({
            ...current,

            primaryColor: data.brandKit.primaryColor,

            secondaryColor: data.brandKit.secondaryColor,

            useBrandKit: true,

            showLogo: Boolean(data.brandKit.logoSecureUrl),
          }));
        } else {
          setSettings((current) => ({
            ...current,
            useBrandKit: false,
            showLogo: false,
          }));
        }
      } catch {
        setSettings((current) => ({
          ...current,
          useBrandKit: false,
          showLogo: false,
        }));
      } finally {
        setBrandKitLoading(false);
      }
    }

    loadBrandKit();
  }, []);

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

  async function handleCreate() {
    if (!file || !settings.title.trim() || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const result = await createYouTubeThumbnail(file, {
        settings,
        brandKit,
      });

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
          : "Thumbnail generation failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const activePrimary =
    settings.useBrandKit && brandKit
      ? brandKit.primaryColor
      : settings.primaryColor;

  const logoUrl =
    settings.useBrandKit && settings.showLogo ? brandKit?.logoSecureUrl : null;

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose thumbnail image"
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">Thumbnail preview</p>

            <p className="mt-1 text-sm text-muted">1280 × 720 · 16:9</p>
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
            Change Image
          </button>
        </div>

        <div className="relative mt-5 aspect-video overflow-hidden rounded-xl bg-slate-950">
          <Image
            src={previewUrl}
            alt="Thumbnail source"
            fill
            unoptimized
            sizes="700px"
            className="object-cover"
            style={{
              objectPosition: `${settings.focusX}% ${settings.focusY}%`,
            }}
          />

          {settings.template === "BOLD_LEFT" && (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, rgba(0,0,0,${settings.overlayOpacity / 100}) 0%, rgba(0,0,0,${settings.overlayOpacity / 160}) 55%, rgba(0,0,0,0) 75%)`,
              }}
            />
          )}

          {settings.template === "CENTERED" && (
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: `rgba(0,0,0,${Math.min(0.7, settings.overlayOpacity / 115)})`,
              }}
            />
          )}

          {settings.template === "CLEAN_BOTTOM" && (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent 35%, rgba(0,0,0,${Math.max(0.6, settings.overlayOpacity / 100)}) 100%)`,
              }}
            />
          )}

          <div className="pointer-events-none absolute inset-[5%] border border-dashed border-white/30" />

          {logoUrl && (
            <div
              role="img"
              aria-label="Brand logo"
              className="absolute right-[5%] top-[7%] h-[14%] w-[18%] bg-contain bg-top-right bg-no-repeat drop-shadow"
              style={{
                backgroundImage: `url("${logoUrl}")`,
              }}
            />
          )}

          {settings.template === "BOLD_LEFT" && (
            <div className="absolute left-[5%] top-[18%] w-[60%]">
              <div
                className="mb-4 h-1.5 w-20"
                style={{
                  backgroundColor: activePrimary,
                }}
              />

              <p
                className="text-2xl font-black leading-[1.02] sm:text-4xl"
                style={{
                  color: settings.titleColor,
                }}
              >
                {settings.title}
              </p>

              {settings.subtitle && (
                <p className="mt-3 text-xs font-medium text-white/90 sm:text-base">
                  {settings.subtitle}
                </p>
              )}
            </div>
          )}

          {settings.template === "CENTERED" && (
            <div className="absolute inset-x-[8%] top-1/2 -translate-y-1/2 text-center">
              <p
                className="text-2xl font-black leading-[1.02] sm:text-4xl"
                style={{
                  color: settings.titleColor,
                }}
              >
                {settings.title}
              </p>

              {settings.subtitle && (
                <p className="mt-3 text-xs text-white/90 sm:text-base">
                  {settings.subtitle}
                </p>
              )}

              <div
                className="mx-auto mt-5 h-1 w-28"
                style={{
                  backgroundColor: activePrimary,
                }}
              />
            </div>
          )}

          {settings.template === "CLEAN_BOTTOM" && (
            <div
              className="absolute bottom-[9%] left-[5%] right-[7%] border-l-4 pl-4"
              style={{
                borderColor: activePrimary,
              }}
            >
              <p
                className="text-xl font-black leading-tight sm:text-3xl"
                style={{
                  color: settings.titleColor,
                }}
              >
                {settings.title}
              </p>

              {settings.subtitle && (
                <p className="mt-2 text-xs text-white/90 sm:text-sm">
                  {settings.subtitle}
                </p>
              )}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs leading-5 text-muted">
          Dashed line shows the safe zone. Keep important text and logos inside
          it.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Template</p>

        <div className="mt-4 grid gap-3">
          {THUMBNAIL_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => updateSetting("template", template.id)}
              className={`rounded-xl border p-4 text-left ${
                settings.template === template.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold text-foreground">{template.name}</p>

              <p className="mt-1 text-xs leading-5 text-muted">
                {template.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Text</p>

        <label className="mt-4 block text-sm font-semibold">
          Title
          <textarea
            rows={3}
            maxLength={100}
            value={settings.title}
            onChange={(event) => updateSetting("title", event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Subtitle
          <input
            type="text"
            maxLength={140}
            value={settings.subtitle}
            onChange={(event) => updateSetting("subtitle", event.target.value)}
            placeholder="Optional supporting text"
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Title color
          <input
            type="color"
            value={settings.titleColor}
            onChange={(event) =>
              updateSetting("titleColor", event.target.value)
            }
            className="mt-2 h-11 w-full rounded-xl border border-border p-1"
          />
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Image focus</p>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Horizontal</span>

            <span className="font-semibold text-primary">
              {settings.focusX}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={settings.focusX}
            onChange={(event) =>
              updateSetting("focusX", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Vertical</span>

            <span className="font-semibold text-primary">
              {settings.focusY}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={settings.focusY}
            onChange={(event) =>
              updateSetting("focusY", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Overlay</span>

            <span className="font-semibold text-primary">
              {settings.overlayOpacity}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="80"
            step="5"
            value={settings.overlayOpacity}
            onChange={(event) =>
              updateSetting("overlayOpacity", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>
      </div>

      {!brandKitLoading && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold text-foreground">Brand Kit</p>

          {brandKit ? (
            <>
              <label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface px-4">
                <input
                  type="checkbox"
                  checked={settings.useBrandKit}
                  onChange={(event) =>
                    updateSetting("useBrandKit", event.target.checked)
                  }
                />

                <span className="text-sm font-semibold">
                  Use saved brand colors
                </span>
              </label>

              {brandKit.logoSecureUrl && (
                <label className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface px-4">
                  <input
                    type="checkbox"
                    checked={settings.useBrandKit && settings.showLogo}
                    disabled={!settings.useBrandKit}
                    onChange={(event) =>
                      updateSetting("showLogo", event.target.checked)
                    }
                  />

                  <span className="text-sm font-semibold">Add saved logo</span>
                </label>
              )}

              <div className="mt-4 flex gap-3">
                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{
                    backgroundColor: brandKit.primaryColor,
                  }}
                />

                <div
                  className="h-10 flex-1 rounded-lg"
                  style={{
                    backgroundColor: brandKit.secondaryColor,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              No Brand Kit saved yet. Thumbnail Maker still works with default
              colors.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Export</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["jpg", "JPG"],
            ["png", "PNG"],
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
        disabled={isProcessing || !settings.title.trim()}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Creating Thumbnail..." : "Create 1280 × 720 Thumbnail"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Final image composition runs locally in your browser.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Rendering your YouTube thumbnail..."
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
            message="YouTube thumbnail created successfully."
          />
        </div>
      )}
    </div>
  );
}
