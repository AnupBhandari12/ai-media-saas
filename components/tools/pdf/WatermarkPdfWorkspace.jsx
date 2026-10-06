"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import WatermarkPdfTool from "@/components/tools/pdf/WatermarkPdfTool";

export default function WatermarkPdfWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Watermark added"
        description="Your watermarked PDF is ready."
        metadata={[
          {
            label: "Pages",
            value: output.result.selectedPages.join(", "),
          },
          {
            label: "Type",
            value: output.result.watermarkType,
          },
          {
            label: "Opacity",
            value: `${output.result.opacityPercent}%`,
          },
          {
            label: "Rotation",
            value: `${output.result.rotationDegrees}°`,
          },
          {
            label: "Size",
            value: `${output.result.sizePercent}%`,
          },
        ]}
      />

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
      toolId="PDF-14"
      title="Add PDF Watermark"
      description="Add text or logo watermarks to selected PDF pages with adjustable opacity, size, and rotation."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <WatermarkPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
