"use client";

function formatBytes(bytes) {
  if (!bytes) {
    return "Unknown size";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoSourceCard({ video, onChangeVideo }) {
  if (!video) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      <video
        src={video.secureUrl}
        controls
        preload="metadata"
        className="w-full rounded-xl bg-black"
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">
            {video.filename}
          </p>

          <p className="mt-1 text-sm text-muted">
            {video.format?.toUpperCase() || "VIDEO"}
            {" · "}
            {formatBytes(video.bytes)}

            {video.duration
              ? ` · ${Number(video.duration).toFixed(1)} sec`
              : ""}
          </p>

          {video.width && video.height && (
            <p className="mt-1 text-xs text-muted">
              {video.width} × {video.height}
            </p>
          )}
        </div>

        {onChangeVideo && (
          <button
            type="button"
            onClick={onChangeVideo}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold"
          >
            Change Video
          </button>
        )}
      </div>
    </div>
  );
}
