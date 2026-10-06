"use client";

import { CldImage, CldUploadWidget } from "next-cloudinary";

import { Save, Trash2, Upload } from "lucide-react";

import { useEffect, useState } from "react";

import {
  BRAND_WATERMARK_POSITIONS,
  BRAND_WATERMARK_TYPES,
  DEFAULT_BRAND_KIT,
} from "@/lib/brandKit";

export default function BrandKitForm({ uploadFolder }) {
  const [form, setForm] = useState(DEFAULT_BRAND_KIT);

  const [logo, setLogo] = useState(null);

  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadBrandKit() {
      try {
        const response = await fetch("/api/brand-kit");

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not load Brand Kit.");
        }

        const brandKit = data.brandKit;

        if (!brandKit) {
          return;
        }

        setForm({
          brandName: brandKit.brandName || "",

          primaryColor: brandKit.primaryColor,

          secondaryColor: brandKit.secondaryColor,

          defaultWatermarkType: brandKit.defaultWatermarkType,

          defaultWatermarkText: brandKit.defaultWatermarkText || "",

          defaultWatermarkOpacity: brandKit.defaultWatermarkOpacity,

          defaultWatermarkSize: brandKit.defaultWatermarkSize,

          defaultWatermarkPosition: brandKit.defaultWatermarkPosition,
        });

        if (brandKit.logoPublicId) {
          setLogo({
            public_id: brandKit.logoPublicId,

            secure_url: brandKit.logoSecureUrl,

            format: brandKit.logoFormat,

            width: brandKit.logoWidth,

            height: brandKit.logoHeight,
          });
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load Brand Kit.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadBrandKit();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  }

  async function handleSave() {
    if (form.defaultWatermarkType === BRAND_WATERMARK_TYPES.LOGO && !logo) {
      setError("Upload a logo before selecting Logo as the default watermark.");

      return;
    }

    try {
      setIsSaving(true);

      setError("");
      setSuccess("");

      const response = await fetch("/api/brand-kit", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          brandName: form.brandName.trim() || null,

          primaryColor: form.primaryColor,

          secondaryColor: form.secondaryColor,

          logoPublicId: logo?.public_id || null,

          defaultWatermarkType: form.defaultWatermarkType,

          defaultWatermarkText: form.defaultWatermarkText.trim() || null,

          defaultWatermarkOpacity: Number(form.defaultWatermarkOpacity),

          defaultWatermarkSize: Number(form.defaultWatermarkSize),

          defaultWatermarkPosition: form.defaultWatermarkPosition,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save Brand Kit.");
      }

      const saved = data.brandKit;

      if (saved.logoPublicId) {
        setLogo({
          public_id: saved.logoPublicId,

          secure_url: saved.logoSecureUrl,

          format: saved.logoFormat,

          width: saved.logoWidth,

          height: saved.logoHeight,
        });
      } else {
        setLogo(null);
      }

      setSuccess("Brand Kit saved successfully.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save Brand Kit.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-background p-5 text-sm text-muted">
        Loading Brand Kit...
      </div>
    );
  }

  return (
    <div>
      <div>
        <p className="font-semibold text-foreground">Brand identity</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          These settings will be reusable in creator, image, and video tools.
        </p>
      </div>

      <label className="mt-6 block text-sm font-semibold text-foreground">
        Brand name
        <input
          type="text"
          maxLength={80}
          value={form.brandName}
          onChange={(event) => updateField("brandName", event.target.value)}
          placeholder="Bhanova Technologies"
          className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
        />
      </label>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-foreground">
          Primary color
          <div className="mt-2 flex items-center gap-3">
            <input
              type="color"
              value={form.primaryColor}
              onChange={(event) =>
                updateField("primaryColor", event.target.value)
              }
              className="h-11 w-16 rounded-lg border border-border bg-background p-1"
            />

            <span className="font-mono text-sm text-muted">
              {form.primaryColor}
            </span>
          </div>
        </label>

        <label className="text-sm font-semibold text-foreground">
          Secondary color
          <div className="mt-2 flex items-center gap-3">
            <input
              type="color"
              value={form.secondaryColor}
              onChange={(event) =>
                updateField("secondaryColor", event.target.value)
              }
              className="h-11 w-16 rounded-lg border border-border bg-background p-1"
            />

            <span className="font-mono text-sm text-muted">
              {form.secondaryColor}
            </span>
          </div>
        </label>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="font-semibold text-foreground">Brand logo</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          PNG works best for transparent logos. JPG and WebP are also supported.
        </p>

        {logo && (
          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <div className="flex min-h-40 items-center justify-center rounded-lg bg-slate-100 p-5">
              <CldImage
                src={logo.public_id}
                width={logo.width || 600}
                height={logo.height || 300}
                alt="Brand logo"
                className="max-h-32 w-auto object-contain"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setLogo(null);

                if (form.defaultWatermarkType === BRAND_WATERMARK_TYPES.LOGO) {
                  updateField(
                    "defaultWatermarkType",
                    BRAND_WATERMARK_TYPES.TEXT,
                  );
                }

                setSuccess("");
              }}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600"
            >
              <Trash2 size={17} />
              Remove Logo
            </button>
          </div>
        )}

        <div className="mt-4">
          <CldUploadWidget
            signatureEndpoint="/api/cloudinary/sign"
            options={{
              sources: ["local"],

              multiple: false,

              resourceType: "image",

              clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],

              maxFileSize: 5_000_000,

              maxImageWidth: 4096,

              maxImageHeight: 4096,

              folder: uploadFolder,
            }}
            onSuccess={(result, { widget }) => {
              if (typeof result?.info === "string") {
                return;
              }

              const info = result.info;

              setLogo(info);

              setError("");
              setSuccess("");

              widget.close();
            }}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground"
              >
                <Upload size={17} />

                {logo ? "Replace Logo" : "Upload Logo"}
              </button>
            )}
          </CldUploadWidget>
        </div>
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <p className="font-semibold text-foreground">Default watermark</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Later watermark tools can load these defaults automatically.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              updateField("defaultWatermarkType", BRAND_WATERMARK_TYPES.TEXT)
            }
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${
              form.defaultWatermarkType === BRAND_WATERMARK_TYPES.TEXT
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background"
            }`}
          >
            Text
          </button>

          <button
            type="button"
            disabled={!logo}
            onClick={() =>
              updateField("defaultWatermarkType", BRAND_WATERMARK_TYPES.LOGO)
            }
            className={`min-h-11 rounded-xl border px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
              form.defaultWatermarkType === BRAND_WATERMARK_TYPES.LOGO
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background"
            }`}
          >
            Logo
          </button>
        </div>

        {form.defaultWatermarkType === BRAND_WATERMARK_TYPES.TEXT && (
          <label className="mt-5 block text-sm font-semibold text-foreground">
            Watermark text
            <input
              type="text"
              maxLength={100}
              value={form.defaultWatermarkText}
              onChange={(event) =>
                updateField("defaultWatermarkText", event.target.value)
              }
              placeholder="© Bhanova Technologies"
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-4 outline-none focus:border-primary"
            />
          </label>
        )}

        <div className="mt-6">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-semibold">Opacity</span>

            <span className="font-semibold text-primary">
              {form.defaultWatermarkOpacity}%
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={form.defaultWatermarkOpacity}
            onChange={(event) =>
              updateField("defaultWatermarkOpacity", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between gap-4 text-sm">
            <span className="font-semibold">Size</span>

            <span className="font-semibold text-primary">
              {form.defaultWatermarkSize}%
            </span>
          </div>

          <input
            type="range"
            min="10"
            max="70"
            step="5"
            value={form.defaultWatermarkSize}
            onChange={(event) =>
              updateField("defaultWatermarkSize", Number(event.target.value))
            }
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <p className="mt-6 text-sm font-semibold text-foreground">Position</p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BRAND_WATERMARK_POSITIONS.map((position) => (
            <button
              key={position.value}
              type="button"
              onClick={() =>
                updateField("defaultWatermarkPosition", position.value)
              }
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                form.defaultWatermarkPosition === position.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background"
              }`}
            >
              {position.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Brand preview</p>

        <div className="mt-4 rounded-xl border border-border bg-surface p-5">
          <p className="text-xl font-bold text-foreground">
            {form.brandName || "Your Brand"}
          </p>

          <div className="mt-4 flex gap-3">
            <div
              className="h-12 flex-1 rounded-lg"
              style={{
                backgroundColor: form.primaryColor,
              }}
            />

            <div
              className="h-12 flex-1 rounded-lg"
              style={{
                backgroundColor: form.secondaryColor,
              }}
            />
          </div>

          <p className="mt-4 text-sm text-muted">
            Default watermark: <strong>{form.defaultWatermarkType}</strong> ·{" "}
            {form.defaultWatermarkPosition}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {success}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
      >
        <Save size={17} />

        {isSaving ? "Saving Brand Kit..." : "Save Brand Kit"}
      </button>
    </div>
  );
}
