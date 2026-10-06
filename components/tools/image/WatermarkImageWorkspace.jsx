"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import WatermarkImageTool from "@/components/tools/image/WatermarkImageTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function WatermarkImageWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Watermark added"
        description="Your watermarked image is ready to download."
        metadata={[
          {
            label: "Type",
            value: output.result.type === "text" ? "Text" : "Logo / Image",
          },
          {
            label: "Position",
            value: output.result.position,
          },
          {
            label: "Opacity",
            value: `${Math.round(output.result.opacity * 100)}%`,
          },
          {
            label: "Size",
            value: `${output.result.sizePercent}%`,
          },
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}px`,
          },
          {
            label: "Output size",
            value: formatBytes(output.result.outputSize),
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Watermarked image preview"
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
      toolId="IMG-12"
      title="Watermark Image"
      description="Add text or logo watermarks to JPG, PNG, and WebP images with custom position, size, and opacity."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <WatermarkImageTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
