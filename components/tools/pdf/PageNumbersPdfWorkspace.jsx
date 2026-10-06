"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import PageNumbersPdfTool from "@/components/tools/pdf/PageNumbersPdfTool";

export default function PageNumbersPdfWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Page numbers added"
        description="The numbered PDF is ready."
        metadata={[
          {
            label: "Pages",
            value: output.result.selectedPages.join(", "),
          },
          {
            label: "Start",
            value: output.result.startNumber,
          },
          {
            label: "Position",
            value: output.result.position.replaceAll("_", " "),
          },
          {
            label: "Font size",
            value: `${output.result.fontSize} pt`,
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
      toolId="PDF-13"
      title="Add Page Numbers"
      description="Add configurable page numbers to selected PDF pages."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <PageNumbersPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
