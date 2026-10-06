"use client";

import Image from "next/image";

import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import {
  POSTER_TEMPLATES,
  createPosterBanner,
  getPosterTemplate,
} from "@/lib/tools/creator/posterBanner";

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const DEFAULT_SETTINGS = {
  template: "BUSINESS_BANNER",

  title: "BUILD SOMETHING GREAT",

  subtitle: "Simple, focused and ready to share.",

  cta: "Learn More",

  focusX: 50,
  focusY: 50,

  overlayOpacity: 70,

  primaryColor: "#4f46e5",

  secondaryColor: "#0891b2",

  textColor: "#ffffff",

  useBrandKit: true,

  showLogo: true,

  outputFormat: "png",
};

export default function PosterBannerTool({ onResultChange }) {
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
      setError("Choose a JPG, PNG, or WebP background image.");

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Background image must be 15 MB or smaller.");

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

      const result = await createPosterBanner(file, {
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
          : "Poster generation failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const template = getPosterTemplate(settings.template);

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
          title="Choose poster background image"
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
            <p className="font-semibold text-foreground">Template preview</p>

            <p className="mt-1 text-sm text-muted">
              {template.width} × {template.height}
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
          className="relative mx-auto mt-5 max-h-620px max-w-xl overflow-hidden rounded-xl bg-slate-950"
          style={{
            aspectRatio: `${template.width}/${template.height}`,
          }}
        >
          <Image
            src={previewUrl}
            alt="Poster background"
            fill
            unoptimized
            sizes="600px"
            className="object-cover"
            style={{
              objectPosition: `${settings.focusX}% ${settings.focusY}%`,
            }}
          />

          <div
            className="absolute inset-0"
            style={{
              background:
                template.id === "BUSINESS_BANNER"
                  ? `linear-gradient(90deg, rgba(15,23,42,${settings.overlayOpacity / 100}) 0%, rgba(15,23,42,0.08) 75%)`
                  : `linear-gradient(180deg, rgba(15,23,42,0.05) 20%, rgba(15,23,42,${settings.overlayOpacity / 100}) 100%)`,
            }}
          />

          {logoUrl && (
            <div
              role="img"
              aria-label="Brand logo"
              className="absolute right-[5%] top-[5%] h-[10%] w-[18%] bg-contain bg-top-right bg-no-repeat"
              style={{
                backgroundImage: `url("${logoUrl}")`,
              }}
            />
          )}

          <div
            className={
              template.id === "STORY_PROMO"
                ? "absolute left-[7%] right-[7%] top-[22%]"
                : template.id === "SQUARE_PROMO"
                  ? "absolute bottom-[10%] left-[8%] right-[8%]"
                  : "absolute left-[6%] top-[24%] w-[58%]"
            }
          >
            <div
              className="mb-3 h-1.5 w-20"
              style={{
                backgroundColor: activePrimary,
              }}
            />

            <p
              className={
                template.id === "STORY_PROMO"
                  ? "text-2xl font-black leading-tight sm:text-5xl"
                  : "text-xl font-black leading-tight sm:text-4xl"
              }
              style={{
                color: settings.textColor,
              }}
            >
              {settings.title}
            </p>

            {settings.subtitle && (
              <p className="mt-3 text-xs leading-5 text-white/90 sm:text-base">
                {settings.subtitle}
              </p>
            )}

            {settings.cta && (
              <span
                className="mt-4 inline-flex rounded-lg px-4 py-2 text-xs font-bold text-white sm:text-sm"
                style={{
                  backgroundColor: activePrimary,
                }}
              >
                {settings.cta}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Template</p>

        <div className="mt-4 grid gap-3">
          {POSTER_TEMPLATES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateSetting("template", item.id)}
              className={`rounded-xl border p-4 text-left ${
                settings.template === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold text-foreground">{item.name}</p>

              <p className="mt-1 text-xs text-muted">
                {item.width} × {item.height}
              </p>

              <p className="mt-2 text-xs leading-5 text-muted">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Content</p>

        <label className="mt-4 block text-sm font-semibold">
          Headline
          <textarea
            rows={3}
            maxLength={120}
            value={settings.title}
            onChange={(event) => updateSetting("title", event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Supporting text
          <textarea
            rows={3}
            maxLength={180}
            value={settings.subtitle}
            onChange={(event) => updateSetting("subtitle", event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-surface p-3 outline-none focus:border-primary"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          CTA label
          <input
            type="text"
            maxLength={40}
            value={settings.cta}
            onChange={(event) => updateSetting("cta", event.target.value)}
            placeholder="Learn More"
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
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
            min="10"
            max="85"
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
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              No Brand Kit saved. Poster Maker still works with default colors.
            </p>
          )}
        </div>
      )}

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
        disabled={isProcessing || !settings.title.trim()}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Creating Poster..." : "Create Poster / Banner"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Rendering poster locally..."
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
            message="Poster created successfully."
          />
        </div>
      )}
    </div>
  );
}
