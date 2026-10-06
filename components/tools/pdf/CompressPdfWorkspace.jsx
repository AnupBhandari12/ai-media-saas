"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import CompressPdfTool from "@/components/tools/pdf/CompressPdfTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompressPdfWorkspace() {
  const [output, setOutput] = useState(null);

  const result = output?.result;

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title={result.keptOriginal ? "Original PDF kept" : "PDF compressed"}
        description={
          result.keptOriginal
            ? "Compression did not produce a smaller file, so AI Media kept the original instead of reducing quality unnecessarily."
            : "A screen-optimized raster PDF is ready to download."
        }
        metadata={[
          {
            label: "Pages",
            value: result.pageCount,
          },
          {
            label: "Preset",
            value: result.presetLabel,
          },
          {
            label: "Original",
            value: formatBytes(result.originalSize),
          },
          {
            label: "Output",
            value: formatBytes(result.outputSize),
          },
          {
            label: "Saved",
            value: result.keptOriginal
              ? "No useful reduction"
              : `${formatBytes(result.savedBytes)} (${result.savedPercent}%)`,
          },
        ]}
      />

      <DownloadGroup
        downloads={[
          {
            name: output.filename,
            filename: output.filename,
            url: output.resultUrl,
          },
        ]}
      />
    </div>
  ) : null;

  return (
    <ToolShell
      toolId="PDF-11"
      title="Basic PDF Compression"
      description="Reduce scanned or image-heavy PDF size by rebuilding pages for screen use."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <CompressPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
