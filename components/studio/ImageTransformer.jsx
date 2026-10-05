"use client";

import { useState } from "react";
import { CldImage, getCldImageUrl } from "next-cloudinary";

import { imagePresets } from "@/lib/presets";

export default function ImageTransformer({ image }) {
  const [selectedPresetId, setSelectedPresetId] = useState(imagePresets[0].id);

  if (!image) {
    return null;
  }

  const selectedPreset = imagePresets.find(
    (preset) => preset.id === selectedPresetId,
  );
  const downloadUrl = getCldImageUrl({
    src: image.public_id,
    width: selectedPreset.width,
    height: selectedPreset.height,
    crop: "fill",
    gravity: "auto",
    rawTransformations: ["fl_attachment"],
  });

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Transform image
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Choose a social media preset and preview the smart crop.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {imagePresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setSelectedPresetId(preset.id)}
            className={`rounded-xl border p-4 text-left transition ${
              selectedPresetId === preset.id
                ? "border-primary bg-primary/5"
                : "border-border bg-background hover:border-primary/40"
            }`}
          >
            <p className="font-semibold text-foreground">{preset.name}</p>

            <p className="mt-1 text-sm text-muted">
              {preset.width} × {preset.height} · {preset.aspectRatio}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-background p-4">
        <p className="mb-4 text-sm font-semibold text-foreground">
          Smart crop preview
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Before */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-3 text-sm font-semibold text-muted">Before</p>

            <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-lg bg-slate-100 p-3">
              <CldImage
                src={image.public_id}
                width={600}
                height={600}
                crop="limit"
                alt={image.original_filename || "Original image"}
                className="max-h-80 w-auto rounded-lg object-contain"
              />
            </div>
          </div>

          {/* After */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">After</p>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                Smart Crop
              </span>
            </div>

            <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-lg bg-slate-100 p-3">
              <CldImage
                key={selectedPreset.id}
                src={image.public_id}
                width={selectedPreset.width}
                height={selectedPreset.height}
                crop="fill"
                gravity="auto"
                alt={image.original_filename || "Transformed image"}
                className="max-h-80 w-auto rounded-lg object-contain"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">{selectedPreset.name}</p>

            <p className="mt-1 text-sm text-muted">
              {selectedPreset.width} × {selectedPreset.height}
            </p>
          </div>

          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Smart Crop
          </span>
        </div>
        <a
          href={downloadUrl}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          Download {selectedPreset.name}
        </a>
      </div>
    </section>
  );
}
