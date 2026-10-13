"use client";

import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

function mb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function level(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} dBFS` : "Unavailable";
}

export default function AudioResultPanel({ result }) {
  if (!result) return null;

  const sizeDifference =
    result.originalBytes > 0
      ? Math.round(
          ((result.originalBytes - result.bytes) / result.originalBytes) * 100,
        )
      : null;

  const metadata = [
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
      value: mb(result.originalBytes),
    },
    {
      label: "Output size",
      value: mb(result.bytes),
    },
  ];

  if (sizeDifference !== null) {
    metadata.push({
      label: sizeDifference >= 0 ? "Saved" : "Size increase",
      value: `${Math.abs(sizeDifference)}%`,
    });
  }

  if (result.operation === "NORMALIZE") {
    metadata.push(
      {
        label: "RMS before (sampled)",
        value: level(result.rmsBeforeDb),
      },
      {
        label: "RMS after (sampled)",
        value: level(result.rmsAfterDb),
      },
      {
        label: "Sampled output peak",
        value: level(result.peakAfterDb),
      },
    );
  }

  return (
    <div className="space-y-4">
      <ResultPanel
        title="Audio ready"
        description="Review the processed audio before downloading."
        metadata={metadata}
      >
        <div className="p-5">
          <audio
            src={result.url}
            controls
            preload="metadata"
            className="w-full"
          />
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

      {result.operation === "NORMALIZE" && (
        <p className="text-xs leading-5 text-muted">
          RMS and peak numbers are sampled estimates, not a professional
          integrated LUFS measurement. Compare by listening as well.
        </p>
      )}
    </div>
  );
}
