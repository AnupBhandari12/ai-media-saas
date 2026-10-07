"use client";

import { Download } from "lucide-react";

import ResultPanel from "@/components/tools/ResultPanel";

function formatBytes(bytes) {
  if (!bytes) {
    return "Unavailable";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function VideoFrameResult({ result }) {
  if (!result) {
    return null;
  }

  return (
    <div className="space-y-4">
      <ResultPanel
        title="Frame ready"
        description="The downloaded image represents the selected video timestamp."
        metadata={[
          {
            label: "Timestamp",
            value: `${Number(result.frameTime).toFixed(1)} sec`,
          },

          {
            label: "Format",
            value: result.format.toUpperCase(),
          },

          {
            label: "Dimensions",
            value: `${result.width} × ${result.height}`,
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
            aria-label="Extracted video frame"
            className="aspect-video w-full rounded-xl bg-slate-950 bg-contain bg-center bg-no-repeat"
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
        Download Frame
      </a>
    </div>
  );
}
