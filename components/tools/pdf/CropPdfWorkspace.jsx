"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import CropPdfTool from "@/components/tools/pdf/CropPdfTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CropPdfWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="PDF cropped"
        description="The selected pages now use the requested visible crop area."
        metadata={[
          {
            label: "Pages cropped",
            value: output.result.selectedPages.join(", "),
          },
          {
            label: "Top",
            value: `${output.result.crop.top}%`,
          },
          {
            label: "Right",
            value: `${output.result.crop.right}%`,
          },
          {
            label: "Bottom",
            value: `${output.result.crop.bottom}%`,
          },
          {
            label: "Left",
            value: `${output.result.crop.left}%`,
          },
          {
            label: "Output size",
            value: formatBytes(output.result.outputSize),
          },
        ]}
      >
        <div className="p-4 text-sm leading-6 text-muted">
          This is a non-destructive PDF crop. It changes the visible page box
          rather than securely deleting hidden content.
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
      toolId="PDF-10"
      title="Crop PDF Pages"
      description="Trim visible PDF margins on selected pages using safe browser-local crop boxes."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <CropPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
