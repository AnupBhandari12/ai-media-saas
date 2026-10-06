"use client";

import { useState } from "react";
import Image from "next/image";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import ConvertImageTool from "@/components/tools/image/ConvertImageTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ConvertImageWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Conversion complete"
        description="Your converted image is ready to download."
        metadata={[
          {
            label: "From",
            value: output.result.inputMimeType,
          },
          {
            label: "To",
            value: output.result.outputMimeType,
          },
          {
            label: "Original size",
            value: formatBytes(output.result.originalSize),
          },
          {
            label: "Result size",
            value: formatBytes(output.result.convertedSize),
          },
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}px`,
          },
          {
            label: "Quality",
            value:
              output.result.quality === null
                ? "Lossless / browser default"
                : `${output.result.quality}%`,
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Converted image preview"
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
      toolId="IMG-05"
      title="Convert Image Format"
      description="Convert JPG, PNG, WebP, and browser-supported AVIF images directly from your workspace."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <ConvertImageTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
