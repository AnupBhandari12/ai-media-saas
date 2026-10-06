"use client";

import { useState } from "react";
import Image from "next/image";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import ResizePixelsTool from "@/components/tools/image/ResizePixelsTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ResizePixelsWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Resize complete"
        description="Your resized image is ready to download."
        metadata={[
          {
            label: "Original dimensions",
            value: `${output.result.originalWidth} × ${output.result.originalHeight}px`,
          },
          {
            label: "Result dimensions",
            value: `${output.result.width} × ${output.result.height}px`,
          },
          {
            label: "Original size",
            value: formatBytes(output.result.originalSize),
          },
          {
            label: "Result size",
            value: formatBytes(output.result.resizedSize),
          },
          {
            label: "Aspect ratio",
            value: output.aspectRatioLocked ? "Locked" : "Unlocked",
          },
          {
            label: "Format",
            value: output.result.mimeType,
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Resized image preview"
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
      toolId="IMG-03"
      title="Resize Image by Pixels"
      description="Resize JPG, PNG, and WebP images to exact pixel dimensions while keeping control over the aspect ratio."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <ResizePixelsTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
