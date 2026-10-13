"use client";

import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

function formatBytes(bytes) {
  if (!bytes) {
    return "0 MB";
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AudioResultPanel({ result }) {
  if (!result) {
    return null;
  }

  const sizeChange = result.originalBytes
    ? Math.round(
        ((result.originalBytes - result.bytes) / result.originalBytes) * 100,
      )
    : null;

  return (
    <div className="space-y-4">
      <ResultPanel
        title="Audio ready"
        description="Preview the processed audio before downloading."
        metadata={[
          {
            label: "Format",

            value: result.format.toUpperCase(),
          },

          {
            label: "Duration",

            value: `${result.duration.toFixed(2)} sec`,
          },

          {
            label: "Original size",

            value: formatBytes(result.originalBytes),
          },

          {
            label: "Output size",

            value: formatBytes(result.bytes),
          },

          ...(sizeChange !== null
            ? [
                {
                  label: sizeChange >= 0 ? "Saved" : "Size change",

                  value:
                    sizeChange >= 0
                      ? `${sizeChange}%`
                      : `+${Math.abs(sizeChange)}%`,
                },
              ]
            : []),
        ]}
      >
        <div className="p-5">
          <audio src={result.url} controls className="w-full" />
        </div>
      </ResultPanel>

      <DownloadGroup
        downloads={[
          {
            name: result.filename,

            filename: result.filename,

            url: result.url,
          },
        ]}
      />
    </div>
  );
}
