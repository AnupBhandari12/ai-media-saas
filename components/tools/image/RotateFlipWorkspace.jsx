"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import RotateFlipTool from "@/components/tools/image/RotateFlipTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RotateFlipWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Transform complete"
        description="Your rotated or flipped image is ready to download."
        metadata={[
          {
            label: "Rotation",
            value: `${output.result.rotation}°`,
          },
          {
            label: "Horizontal flip",
            value: output.result.flipHorizontal ? "Yes" : "No",
          },
          {
            label: "Vertical flip",
            value: output.result.flipVertical ? "Yes" : "No",
          },
          {
            label: "Original dimensions",
            value: `${output.result.originalWidth} × ${output.result.originalHeight}px`,
          },
          {
            label: "Result dimensions",
            value: `${output.result.width} × ${output.result.height}px`,
          },
          {
            label: "Result size",
            value: formatBytes(output.result.transformedSize),
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Transformed image preview"
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
      toolId="IMG-09"
      title="Rotate / Flip Image"
      description="Rotate JPG, PNG, and WebP images in 90-degree steps or flip them horizontally and vertically."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <RotateFlipTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
