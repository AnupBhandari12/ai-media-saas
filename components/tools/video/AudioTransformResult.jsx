"use client";

import { Download } from "lucide-react";

import ResultPanel from "@/components/tools/ResultPanel";

function formatBytes(bytes) {
  if (!bytes) {
    return "Unavailable";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AudioTransformResult({ result }) {
  return (
    <div className="space-y-4">
      <ResultPanel
        title="Audio extracted"
        description="The video's audio track is ready to preview and download."
        metadata={[
          {
            label: "Format",
            value: result.format.toUpperCase(),
          },

          {
            label: "Duration",
            value: `${Number(result.outputDuration).toFixed(1)} sec`,
          },

          {
            label: "File size",
            value: formatBytes(result.outputBytes),
          },
        ]}
      >
        <div className="p-5">
          <audio src={result.playbackUrl} controls className="w-full" />
        </div>
      </ResultPanel>

      <a
        href={result.downloadUrl}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        <Download size={18} />
        Download Audio
      </a>
    </div>
  );
}
