"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import SocialMediaPackTool from "@/components/tools/creator/SocialMediaPackTool";

export default function SocialMediaPackWorkspace() {
  const [output, setOutput] = useState(null);

  function downloadZip() {
    if (!output?.zipUrl) {
      return;
    }

    const link = document.createElement("a");

    link.href = output.zipUrl;

    link.download = "ai-media-social-pack.zip";

    document.body.appendChild(link);

    link.click();

    link.remove();
  }

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Social media pack ready"
        description="One source image was transformed into all successful selected outputs."
        metadata={[
          {
            label: "Successful",
            value: output.successfulResults.length,
          },
          {
            label: "Failed",
            value: output.failedResults.length,
          },
          {
            label: "Source",
            value: `${output.sourceWidth} × ${output.sourceHeight}`,
          },
          {
            label: "Quality",
            value: `${output.qualityPercent}%`,
          },
        ]}
      >
        <div className="divide-y divide-border">
          {output.results.map((item) => (
            <div key={item.presetId} className="p-4">
              <p className="text-sm font-semibold text-foreground">
                {item.name}
              </p>

              <p className="mt-1 text-xs text-muted">
                {item.width} × {item.height} · {item.status}
              </p>
            </div>
          ))}
        </div>
      </ResultPanel>

      <DownloadGroup
        downloads={output.downloads}
        zipLabel="Download Social Pack as ZIP"
        onDownloadAll={downloadZip}
      />
    </div>
  ) : null;

  return (
    <ToolShell
      toolId="CRT-01"
      title="Smart Social Media Pack"
      description="Upload one image and create multiple social, YouTube, and website sizes without re-uploading."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <SocialMediaPackTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
