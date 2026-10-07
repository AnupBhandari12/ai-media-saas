"use client";

import { useEffect, useState } from "react";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";

import ProgressPanel from "@/components/tools/ProgressPanel";
import VideoToolUpload from "@/components/tools/video/VideoToolUpload";

function formatDuration(duration) {
  if (!duration) {
    return "Unknown duration";
  }

  return `${Number(duration).toFixed(1)} sec`;
}

export default function MergeVideosTool({ uploadFolder, onResultChange }) {
  const [library, setLibrary] = useState([]);

  const [selected, setSelected] = useState([]);

  const [loading, setLoading] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  async function loadLibrary() {
    try {

      const response = await fetch("/api/video/library");

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load videos.");
      }

      setLibrary(data.videos);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load videos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLibrary();
  }, []);

  function clearResult() {
    setError("");
    onResultChange?.(null);
  }

  function addVideo(video) {
    if (selected.length >= 4) {
      setError("Merge supports up to 4 clips at once.");

      return;
    }

    if (selected.some((item) => item.id === video.id)) {
      return;
    }

    setSelected((current) => [...current, video]);

    clearResult();
  }

  function removeVideo(id) {
    setSelected((current) => current.filter((item) => item.id !== id));

    clearResult();
  }

  function move(index, direction) {
    const target = index + direction;

    if (target < 0 || target >= selected.length) {
      return;
    }

    setSelected((current) => {
      const next = [...current];

      [next[index], next[target]] = [next[target], next[index]];

      return next;
    });

    clearResult();
  }

  async function handleMerge() {
    if (selected.length < 2 || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      clearResult();

      const response = await fetch("/api/video/cut-merge", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          operation: "MERGE",

          mediaIds: selected.map((video) => video.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Video merge failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Video merge failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const available = library.filter(
    (video) => !selected.some((item) => item.id === video.id),
  );

  return (
    <div>
      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Merge order</p>

        <p className="mt-1 text-sm leading-6 text-muted">
          Select 2–4 clips. The order shown here is the final playback order.
        </p>

        {selected.length === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            No clips selected yet.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {selected.map((video, index) => (
            <div
              key={video.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {video.originalFilename}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {formatDuration(video.duration)}

                    {video.width && video.height
                      ? ` · ${video.width} × ${video.height}`
                      : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeVideo(video.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-red-600"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                  Up
                </button>

                <button
                  type="button"
                  disabled={index === selected.length - 1}
                  onClick={() => move(index, 1)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                  Down
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Recent videos</p>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading videos...</p>
        ) : (
          <div className="mt-4 space-y-2">
            {available.map((video) => (
              <button
                key={video.id}
                type="button"
                disabled={selected.length >= 4}
                onClick={() => addVideo(video)}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-left disabled:opacity-40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {video.originalFilename}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {formatDuration(video.duration)}
                  </p>
                </div>

                <Plus size={18} className="shrink-0 text-primary" />
              </button>
            ))}

            {available.length === 0 && (
              <p className="text-sm text-muted">No additional recent videos.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Upload another clip</p>

        <p className="mt-1 text-sm text-muted">
          The upload is saved to your library first.
        </p>

        <div className="mt-4">
          <VideoToolUpload
            uploadFolder={uploadFolder}
            onVideoReady={async (video) => {
              addVideo({
                id: video.id,

                originalFilename: video.filename,

                secureUrl: video.secureUrl,

                format: video.format,

                bytes: video.bytes,

                width: video.width,

                height: video.height,

                duration: video.duration,
              });

              await loadLibrary();
            }}
          />
        </div>
      </div>

      <button
        type="button"
        disabled={selected.length < 2 || isProcessing}
        onClick={handleMerge}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Merging Videos..." : `Merge ${selected.length} Videos`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Normalizing clips and concatenating them in the selected order..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}
    </div>
  );
}
