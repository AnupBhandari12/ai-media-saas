"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import BlurRedactTool from "@/components/tools/image/BlurRedactTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function BlurRedactWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title={
          output.result.mode === "blur" ? "Region blurred" : "Region redacted"
        }
        description="Your protected image is ready to download."
        metadata={[
          {
            label: "Mode",
            value: output.result.mode === "blur" ? "Blur" : "Redact",
          },
          {
            label: "Region",
            value: `${output.result.region.width} × ${output.result.region.height}px`,
          },
          {
            label: "Position",
            value: `X ${output.result.region.x}, Y ${output.result.region.y}`,
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
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Protected image result"
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
      toolId="IMG-15"
      title="Blur / Redact Region"
      description="Hide sensitive parts of an image by blurring or permanently covering a selected pixel region."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <BlurRedactTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
