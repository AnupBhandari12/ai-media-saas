"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import CropImageTool from "@/components/tools/image/CropImageTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CropImageWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Crop complete"
        description="Your cropped image is ready to download."
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
            label: "Crop position",
            value: `X ${output.result.x}, Y ${output.result.y}`,
          },
          {
            label: "Preset",
            value: output.preset,
          },
          {
            label: "Original size",
            value: formatBytes(output.result.originalSize),
          },
          {
            label: "Result size",
            value: formatBytes(output.result.croppedSize),
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Cropped image preview"
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
      toolId="IMG-08"
      title="Crop Image"
      description="Crop JPG, PNG, and WebP images freely or use common aspect-ratio presets."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <CropImageTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
