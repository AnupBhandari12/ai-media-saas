"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import MergePdfTool from "@/components/tools/pdf/MergePdfTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function MergePdfWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="PDFs merged"
        description="Your PDF files were combined in the selected order."
        metadata={[
          {
            label: "PDF files",
            value: output.result.sourceCount,
          },
          {
            label: "Pages",
            value: output.result.totalPageCount,
          },
          {
            label: "Original total",
            value: formatBytes(output.result.originalTotalSize),
          },
          {
            label: "Merged size",
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
      toolId="PDF-04"
      title="Merge PDFs"
      description="Combine multiple PDF files locally in your chosen order."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <MergePdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
