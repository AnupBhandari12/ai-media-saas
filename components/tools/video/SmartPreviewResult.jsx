"use client";

import { Download } from "lucide-react";

import ResultPanel from "@/components/tools/ResultPanel";

export default function SmartPreviewResult({ result }) {
  const mode =
    result.previewMode === "AI_PREVIEW"
      ? "AI-selected preview"
      : "Safe fallback clip";

  return (
    <div className="space-y-4">
      <ResultPanel
        title="Preview ready"
        description="The original video remains unchanged and playable."
        metadata={[
          {
            label: "Mode",
            value: mode,
          },

          {
            label: "Duration",
            value: `${Number(result.outputDuration).toFixed(1)} sec`,
          },

          {
            label: "Format",
            value: result.format.toUpperCase(),
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
        Download Preview
      </a>
    </div>
  );
}
