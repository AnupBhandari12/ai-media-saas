"use client";

import { useState } from "react";
import Image from "next/image";
import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import CompressTargetTool from "@/components/tools/image/CompressTargetTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CompressTargetWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title={
          output.result.originalAlreadyFits
            ? "Original already fits"
            : output.result.reachedTarget
              ? "Target reached"
              : "Closest safe result"
        }
        description={
          output.result.originalAlreadyFits
            ? "The original image was already within your selected target."
            : output.result.reachedTarget
              ? "AI Media reached your selected target while preserving the best result found."
              : "The selected target could not be reached safely with the current limits."
        }
        metadata={[
          {
            label: "Original",
            value: formatBytes(output.result.originalSize),
          },
          {
            label: "Target",
            value: formatBytes(output.result.targetBytes),
          },
          {
            label: "Result",
            value: formatBytes(output.result.compressedSize),
          },
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}`,
          },
          {
            label: "Quality",
            value:
              output.result.quality === null
                ? "Original"
                : `${output.result.quality}%`,
          },
          {
            label: "Scale",
            value: `${Math.round(output.result.scale * 100)}%`,
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Target compressed image preview"
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
      toolId="IMG-02"
      title="Compress to Target Size"
      description="Compress JPG, PNG, or WebP images to 100 KB, 200 KB, 500 KB, 1 MB, or a custom target size."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <CompressTargetTool
          onResultChange={setOutput}
        />
      </div>
    </ToolShell>
  );
}