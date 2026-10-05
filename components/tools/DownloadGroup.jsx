"use client";

import { Download, FolderArchive } from "lucide-react";

export default function DownloadGroup({
  downloads = [],
  zipLabel = "Download All",
  onDownloadAll,
  disabled = false,
}) {
  const hasMultipleFiles = downloads.length > 1;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div>
        <p className="font-semibold text-foreground">Download</p>

        <p className="mt-1 text-sm text-muted">
          Save your processed output to your device.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {downloads.map((item) => (
          <a
            key={`${item.name}-${item.url}`}
            href={item.url}
            download={item.filename || item.name}
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="min-w-0 truncate">{item.name}</span>

            <Download size={17} className="shrink-0 text-primary" />
          </a>
        ))}

        {hasMultipleFiles && onDownloadAll && (
          <button
            type="button"
            disabled={disabled}
            onClick={onDownloadAll}
            className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FolderArchive size={18} />

            {zipLabel}
          </button>
        )}
      </div>
    </div>
  );
}
