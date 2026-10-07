"use client";

import { Download } from "lucide-react";

import ResultPanel from "@/components/tools/ResultPanel";

function formatBytes(bytes) {
  if (!bytes) {
    return "Unavailable";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function TargetCompressResult({ result }) {
  if (!result) {
    return null;
  }

  const statusLabel =
    result.targetStatus === "ALREADY_WITHIN_TARGET"
      ? "Already under target"
      : result.targetReached
        ? "Target reached"
        : "Closest safe result";

  return (
    <div className="space-y-4">
      <ResultPanel
        title={statusLabel}
        description={
          result.targetReached
            ? "The result is at or below your requested target."
            : "The exact target was not safely reached, so AI Media returned the closest measured result."
        }
        metadata={[
          {
            label: "Target",
            value: `${result.targetMb} MB`,
          },

          {
            label: "Original",
            value: formatBytes(result.originalBytes),
          },

          {
            label: "Result",
            value: formatBytes(result.outputBytes),
          },

          {
            label: "Attempts",
            value: result.attempts,
          },
        ]}
      >
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
