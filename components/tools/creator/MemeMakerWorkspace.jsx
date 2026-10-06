"use client";

import Image from "next/image";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import MemeMakerTool from "@/components/tools/creator/MemeMakerTool";

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MemeMakerWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Meme ready"
        description="The downloaded meme uses the same canvas renderer as the live preview."
        metadata={[
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}`,
          },
          {
            label: "Format",
            value: output.result.format.toUpperCase(),
          },
          {
            label: "Size",
            value: formatBytes(output.result.outputSize),
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-950">
          <Image
            src={output.resultUrl}
            alt="Generated meme"
            fill
            unoptimized
            sizes="700px"
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
      toolId="CRT-06"
      title="Meme Maker"
      description="Create fast memes with top, bottom, or custom text using outlined, wrapped canvas text."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <MemeMakerTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
