"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import PhotosToPdfTool from "@/components/tools/pdf/PhotosToPdfTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function orientationLabel(orientation) {
  const labels = {
    AUTO: "Auto",
    PORTRAIT: "Portrait",
    LANDSCAPE: "Landscape",
    PER_IMAGE: "Fit each photo",
  };

  return labels[orientation] || orientation;
}

export default function PhotosToPdfWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="PDF ready"
        description="Your photos were combined into one PDF in the selected order."
        metadata={[
          {
            label: "Pages",
            value: output.result.pageCount,
          },
          {
            label: "Page size",
            value:
              output.result.pageSize === "FIT"
                ? "Fit Photo"
                : output.result.pageSize,
          },
          {
            label: "Orientation",
            value: orientationLabel(output.result.orientation),
          },
          {
            label: "Margin",
            value: `${output.result.margin} pt`,
          },
          {
            label: "Photos total",
            value: formatBytes(output.result.originalTotalSize),
          },
          {
            label: "PDF size",
            value: formatBytes(output.result.outputSize),
          },
        ]}
      >
        <div className="flex min-h-72 flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText size={30} />
          </div>

          <p className="mt-4 font-semibold text-foreground">
            {output.result.pageCount} page PDF
          </p>

          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Your PDF was created locally and is ready to save to your device.
          </p>
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
      toolId="PDF-01"
      title="Photos to One PDF"
      description="Combine JPG, PNG, or WebP photos into one ordered PDF with A4, Letter, or fit-to-photo pages."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <PhotosToPdfTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
