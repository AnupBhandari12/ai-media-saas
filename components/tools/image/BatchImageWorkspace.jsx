"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import BatchImageTool from "@/components/tools/image/BatchImageTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BatchImageWorkspace() {
  const [output, setOutput] = useState(null);

  function downloadZip() {
    if (!output?.zipUrl) {
      return;
    }

    const link = document.createElement("a");

    link.href = output.zipUrl;

    link.download = "ai-media-batch-images.zip";

    document.body.appendChild(link);

    link.click();

    link.remove();
  }

  const originalTotal =
    output?.results.reduce((sum, item) => sum + item.originalSize, 0) || 0;

  const outputTotal =
    output?.results.reduce((sum, item) => sum + item.outputSize, 0) || 0;

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Batch complete"
        description={`${output.results.length} images were processed locally and packaged into a ZIP file.`}
        metadata={[
          {
            label: "Files",
            value: output.results.length,
          },
          {
            label: "Scale",
            value: `${output.scalePercent}%`,
          },
          {
            label: "Original total",
            value: formatBytes(originalTotal),
          },
          {
            label: "Output total",
            value: formatBytes(outputTotal),
          },
        ]}
      >
        <div className="divide-y divide-border">
          {output.results.map((item) => (
            <div key={item.filename} className="p-4">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.filename}
              </p>

              <p className="mt-1 text-xs text-muted">
                {item.originalWidth} × {item.originalHeight}
                px → {item.width} × {item.height}
                px
              </p>

              <p className="mt-1 text-xs text-muted">
                {formatBytes(item.originalSize)} →{" "}
                {formatBytes(item.outputSize)}
              </p>
            </div>
          ))}
        </div>
      </ResultPanel>

      <DownloadGroup
        downloads={output.downloads}
        zipLabel="Download All as ZIP"
        onDownloadAll={downloadZip}
      />
    </div>
  ) : null;

  return (
    <ToolShell
      toolId="IMG-16"
      title="Batch Image Processor"
      description="Resize and convert multiple JPG, PNG, or WebP images locally, then download individual results or one ZIP file."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <BatchImageTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
