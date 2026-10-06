"use client";

import Image from "next/image";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import PosterBannerTool from "@/components/tools/creator/PosterBannerTool";

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PosterBannerWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Poster ready"
        description="Your focused poster or banner is ready to download."
        metadata={[
          {
            label: "Template",
            value: output.result.templateName,
          },
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}`,
          },
          {
            label: "Format",
            value: output.result.format.toUpperCase(),
          },
          {
            label: "Brand Kit",
            value: output.result.brandKitApplied ? "Applied" : "Not used",
          },
          {
            label: "Size",
            value: formatBytes(output.result.outputSize),
          },
        ]}
      >
        <div className="relative min-h-80 bg-slate-950">
          <Image
            src={output.resultUrl}
            alt="Generated poster"
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
      toolId="CRT-07"
      title="Simple Poster / Banner"
      description="Create fast social or business graphics using focused templates, editable text, image focus, CTA, and optional Brand Kit."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <PosterBannerTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
