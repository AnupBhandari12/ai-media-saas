"use client";

import { useState } from "react";
import Image from "next/image";
import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import CompressImageTool from "@/components/tools/image/CompressImageTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompressImageWorkspace() {
  const [output, setOutput] = useState(null);

  const savedPercent = output?.result?.reduced
    ? Math.round(
        (1 -
          output.result.compressedSize /
            output.result.originalSize) *
          100
      )
    : 0;

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title={
          output.result.reduced
            ? "Compression complete"
            : "Original file kept"
        }
        description={
          output.result.reduced
            ? "Your compressed image is ready to download."
            : "Compression did not create a smaller file, so AI Media kept the original."
        }
        metadata={[
          {
            label: "Original",
            value: formatBytes(output.result.originalSize),
          },
          {
            label: "Result",
            value: formatBytes(output.result.compressedSize),
          },
          {
            label: "Saved",
            value: `${savedPercent}%`,
          },
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}`,
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Compressed image preview"
            fill
            unoptimized
            sizes="(max-width: 1280px) 100vw, 40vw"
            className="object-contain p-4"
          />
        </div>
      </ResultPanel>

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
      toolId="IMG-01"
      title="Compress Image"
      description="Reduce JPG, PNG, and WebP file size directly in your browser while keeping control over image quality."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <CompressImageTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}