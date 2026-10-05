"use client";

import { useState } from "react";
import { CldImage, getCldImageUrl, getCldVideoUrl } from "next-cloudinary";

import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";

function getDownloadUrl(item) {
  if (item.type === "IMAGE") {
    return getCldImageUrl({
      src: item.cloudinaryPublicId,
      rawTransformations: ["fl_attachment"],
    });
  }

  return getCldVideoUrl({
    src: item.cloudinaryPublicId,
    rawTransformations: ["fl_attachment"],
  });
}

export default function LibraryGrid({ media }) {
  const [filter, setFilter] = useState("ALL");
  const [mediaItems, setMediaItems] = useState(media);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const isDeleting = deletingId !== null;
  const filteredMedia =
    filter === "ALL"
      ? mediaItems
      : mediaItems.filter((item) => item.type === filter);

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Delete "${item.originalFilename}" permanently?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setDeleteError("");

    try {
      const response = await fetch(`/api/media/${item.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete media.");
      }

      setMediaItems((currentMedia) =>
        currentMedia.filter((mediaItem) => mediaItem.id !== item.id),
      );
    } catch (error) {
      console.error(error);
      setDeleteError("Media could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["ALL", "IMAGE", "VIDEO"].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === type
                ? "bg-primary text-white"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {type === "ALL"
              ? "All Media"
              : type === "IMAGE"
                ? "Images"
                : "Videos"}
          </button>
        ))}
      </div>

      {deleteError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {deleteError}
        </p>
      )}

      {filteredMedia.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="font-medium text-foreground">No media found</p>

          <p className="mt-2 text-sm text-muted">
            There are no files in this category yet.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMedia.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-2xl border border-border bg-surface"
            >
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-black">
                {item.type === "IMAGE" ? (
                  <CldImage
                    src={item.cloudinaryPublicId}
                    width={600}
                    height={400}
                    crop="fill"
                    gravity="auto"
                    alt={item.originalFilename}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={item.secureUrl}
                    controls
                    preload="metadata"
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {item.originalFilename}
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      {item.type}
                      {item.format ? ` · ${item.format.toUpperCase()}` : ""}
                    </p>
                  </div>

                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {item.status}
                  </span>
                </div>

                {item.bytes && (
                  <p className="mt-3 text-xs text-muted">
                    {(item.bytes / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <a
                    href={item.secureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-background"
                  >
                    <ExternalLink size={16} />
                    Open
                  </a>

                  <a
                    href={getDownloadUrl(item)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    <Download size={16} />
                    Download
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={isDeleting}
                    aria-busy={deletingId === item.id}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === item.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}

                    {deletingId === item.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
