"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import ExtractPdfTool from "@/components/tools/pdf/ExtractPdfTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ExtractPdfWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Pages extracted"
        description="The selected pages were copied into a new PDF."
        metadata={[
          {
            label: "Original pages",
            value: output.result.originalPageCount,
          },
          {
            label: "Output pages",
            value: output.result.outputPageCount,
          },
          {
            label: "Selected",
            value: output.result.selectedPages.join(", "),
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
      toolId="PDF-06"
      title="Extract PDF Pages"
      description="Keep selected pages or ranges and create one new PDF locally."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <ExtractPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
