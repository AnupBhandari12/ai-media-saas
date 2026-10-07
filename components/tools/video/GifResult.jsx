"use client";

import { Download } from "lucide-react";

import ResultPanel from "@/components/tools/ResultPanel";

function formatBytes(bytes) {
  if (!bytes) {
    return "Unavailable";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function GifResult({ result }) {
  return (
    <div className="space-y-4">
      <ResultPanel
        title="GIF ready"
        description="Your short looping GIF is ready."
        metadata={[
          {
            label: "Duration",
            value: `${Number(result.outputDuration).toFixed(1)} sec`,
          },

          {
            label: "Dimensions",
            value: result.height
              ? `${result.width} × ${result.height}`
              : `${result.width}px wide`,
          },

          {
            label: "Size",
            value: formatBytes(result.outputBytes),
          },
        ]}
      >
        <div className="p-4">
          <div
            role="img"
            aria-label="Generated GIF"
            className="min-h-72 w-full rounded-xl bg-slate-950 bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${result.playbackUrl}")`,
            }}
          />
        </div>
      </ResultPanel>

      <a
        href={result.downloadUrl}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        <Download size={18} />
        Download GIF
      </a>
    </div>
  );
}
