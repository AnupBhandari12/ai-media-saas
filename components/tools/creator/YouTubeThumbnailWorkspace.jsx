"use client";

import Image from "next/image";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import YouTubeThumbnailTool from "@/components/tools/creator/YouTubeThumbnailTool";

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const TEMPLATE_LABELS = {
  BOLD_LEFT: "Bold Left",

  CENTERED: "Centered",

  CLEAN_BOTTOM: "Clean Bottom",
};

export default function YouTubeThumbnailWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Thumbnail ready"
        description="Your YouTube thumbnail was exported at the standard 1280 × 720 size."
        metadata={[
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}`,
          },
          {
            label: "Template",
            value: TEMPLATE_LABELS[output.result.template],
          },
          {
            label: "Format",
            value: output.result.format.toUpperCase(),
          },
          {
            label: "File size",
            value: formatBytes(output.result.outputSize),
          },
          {
            label: "Brand Kit",
            value: output.result.brandKitApplied ? "Applied" : "Not used",
          },
        ]}
      >
        <div className="relative aspect-video overflow-hidden bg-slate-950">
          <Image
            src={output.resultUrl}
            alt="Generated YouTube thumbnail"
            fill
            unoptimized
            sizes="640px"
            className="object-contain"
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
      toolId="CRT-04"
      title="YouTube Thumbnail Maker"
      description="Create focused 1280 × 720 thumbnails with templates, title text, image focus controls, safe zones, and optional Brand Kit styling."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <YouTubeThumbnailTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
