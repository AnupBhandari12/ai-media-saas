"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import SplitPdfTool from "@/components/tools/pdf/SplitPdfTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SplitPdfWorkspace() {
  const [output, setOutput] = useState(null);

  function downloadZip() {
    if (!output?.zipUrl) {
      return;
    }

    const link = document.createElement("a");

    link.href = output.zipUrl;

    link.download = "ai-media-split-pdfs.zip";

    document.body.appendChild(link);

    link.click();

    link.remove();
  }

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="PDF split complete"
        description={`${output.results.length} PDF file${output.results.length === 1 ? "" : "s"} created.`}
        metadata={[
          {
            label: "Original pages",
            value: output.pageCount,
          },
          {
            label: "Output files",
            value: output.results.length,
          },
          {
            label: "Original size",
            value: formatBytes(output.originalSize),
          },
        ]}
      >
        <div className="divide-y divide-border">
          {output.results.map((result) => (
            <div key={result.filename} className="p-4">
              <p className="truncate text-sm font-semibold text-foreground">
                {result.filename}
              </p>

              <p className="mt-1 text-xs text-muted">
                Pages {result.label} · {result.pageCount} page
                {result.pageCount === 1 ? "" : "s"} · {formatBytes(result.size)}
              </p>
            </div>
          ))}
        </div>
      </ResultPanel>

      <DownloadGroup
        downloads={output.downloads}
        zipLabel="Download All as ZIP"
        onDownloadAll={output.results.length > 1 ? downloadZip : undefined}
      />
    </div>
  ) : null;

  return (
    <ToolShell
      toolId="PDF-05"
      title="Split PDF by Ranges"
      description="Split one PDF into multiple files using page ranges such as 1-3,4-8,9."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <SplitPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
