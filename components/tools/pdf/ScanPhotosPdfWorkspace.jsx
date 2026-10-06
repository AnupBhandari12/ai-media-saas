"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import ScanPhotosPdfTool from "@/components/tools/pdf/ScanPhotosPdfTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const MODE_LABELS = {
  ORIGINAL: "Original",
  GRAYSCALE: "Grayscale",
  ENHANCE: "Document Enhance",
};

export default function ScanPhotosPdfWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Scanned PDF ready"
        description="Your document photos were combined into one locally processed PDF."
        metadata={[
          {
            label: "Pages",
            value: output.result.pageCount,
          },
          {
            label: "Appearance",
            value: MODE_LABELS[output.result.mode],
          },
          {
            label: "Page layout",
            value: output.result.pageSize === "FIT" ? "Fit Photo" : "A4",
          },
          {
            label: "Photo total",
            value: formatBytes(output.result.originalTotalSize),
          },
          {
            label: "PDF size",
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
      toolId="PDF-17"
      title="Scan Photos to PDF"
      description="Turn phone photos of documents, notes, receipts, and forms into a clean ordered PDF."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <ScanPhotosPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
