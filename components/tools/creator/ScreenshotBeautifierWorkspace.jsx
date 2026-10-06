"use client";

import Image from "next/image";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import ScreenshotBeautifierTool from "@/components/tools/creator/ScreenshotBeautifierTool";

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ScreenshotBeautifierWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Screenshot ready"
        description="Your screenshot was framed without unnecessarily resizing the source content."
        metadata={[
          {
            label: "Source",
            value: `${output.result.sourceWidth} × ${output.result.sourceHeight}`,
          },
          {
            label: "Output",
            value: `${output.result.width} × ${output.result.height}`,
          },
          {
            label: "Frame",
            value: output.result.frame,
          },
          {
            label: "Padding",
            value: `${output.result.padding}px`,
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
        <div className="relative min-h-72 bg-slate-100">
          <Image
            src={output.resultUrl}
            alt="Beautified screenshot"
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
      toolId="CRT-05"
      title="Screenshot Beautifier"
      description="Turn raw screenshots into polished share-ready images with themes, padding, rounded cards, browser frames, and native-resolution export."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <ScreenshotBeautifierTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
