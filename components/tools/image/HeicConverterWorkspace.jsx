"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import HeicConverterTool from "@/components/tools/image/HeicConverterTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function HeicConverterWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="HEIC converted"
        description="Your compatible image is ready to download."
        metadata={[
          {
            label: "Output format",
            value: output.result.outputMimeType,
          },
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}px`,
          },
          {
            label: "Original size",
            value: formatBytes(output.result.originalSize),
          },
          {
            label: "Output size",
            value: formatBytes(output.result.outputSize),
          },
          {
            label: "Quality",
            value:
              output.result.quality === null
                ? "PNG"
                : `${output.result.quality}%`,
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Converted HEIC result"
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
      toolId="IMG-06"
      title="HEIC / HEIF to JPG / PNG"
      description="Convert iPhone HEIC or HEIF photos into broadly compatible JPG or PNG images."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <HeicConverterTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
