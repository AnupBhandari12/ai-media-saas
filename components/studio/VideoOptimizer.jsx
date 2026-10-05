"use client";

import { CldImage, getCldVideoUrl } from "next-cloudinary";

export default function VideoOptimizer({ video }) {
  if (!video) {
    return null;
  }

  const optimizedUrl = getCldVideoUrl({
    src: video.public_id,
    rawTransformations: ["q_auto", "f_auto"],
  });

  const downloadUrl = getCldVideoUrl({
    src: video.public_id,
    rawTransformations: ["q_auto", "f_auto", "fl_attachment"],
  });

  return (
    <section className="mt-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Video optimization
        </h2>

        <p className="mt-2 text-sm leading-6 text-muted">
          Compare the original upload with Cloudinary optimized delivery.
        </p>
      </div>

      <div className="mt-6">
        <p className="mb-3 text-sm font-semibold text-foreground">
          Video thumbnail
        </p>

        <div className="max-w-md overflow-hidden rounded-xl border border-border bg-background p-3">
          <CldImage
            assetType="video"
            src={video.public_id}
            width={640}
            height={360}
            crop="fill"
            alt={`${video.original_filename || "Video"} thumbnail`}
            className="h-auto w-full rounded-lg"
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Original */}
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="mb-3 text-sm font-semibold text-muted">Original</p>

          <video
            src={video.secure_url}
            controls
            className="w-full rounded-xl bg-black"
          />

          <p className="mt-3 text-sm text-muted">
            {video.bytes
              ? `${(video.bytes / 1024 / 1024).toFixed(2)} MB`
              : "Original file"}
          </p>
        </div>

        {/* Optimized */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Optimized</p>

            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Auto Quality
            </span>
          </div>

          <video
            src={optimizedUrl}
            controls
            className="w-full rounded-xl bg-black"
          />

          <p className="mt-3 text-sm text-muted">
            Cloudinary optimized delivery
          </p>
        </div>
      </div>
      <a
        href={downloadUrl}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
      >
        Download Optimized Video
      </a>
    </section>
  );
}
