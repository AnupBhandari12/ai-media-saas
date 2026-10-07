"use client";

import { Download } from "lucide-react";

import ResultPanel from "@/components/tools/ResultPanel";

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) {
    return "Unavailable";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoTransformResult({ result, title, description }) {
  if (!result) {
    return null;
  }

  const metadata = [
    {
      label: "Format",
      value: result.format?.toUpperCase() || "VIDEO",
    },

    {
      label: "Original size",
      value: formatBytes(result.originalBytes),
    },

    {
      label: "Output size",
      value: formatBytes(result.outputBytes),
    },

    {
      label: "Duration",
      value: result.outputDuration
        ? `${Number(result.outputDuration).toFixed(1)} sec`
        : "—",
    },
  ];

  if (result.savedPercent !== null && result.savedPercent !== undefined) {
    metadata.push({
      label: result.savedPercent >= 0 ? "Saved" : "Size change",

      value:
        result.savedPercent >= 0
          ? `${result.savedPercent}%`
          : `+${Math.abs(result.savedPercent)}%`,
    });
  }

  return (
    <div className="space-y-4">
      <ResultPanel title={title} description={description} metadata={metadata}>
        <div className="p-4">
          <video
            src={result.playbackUrl}
            controls
            preload="metadata"
            className="w-full rounded-xl bg-black"
          />
        </div>
      </ResultPanel>

      <a
        href={result.downloadUrl}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        <Download size={18} />
        Download Result
      </a>
    </div>
  );
}
