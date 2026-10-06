"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import PdfPageOrganizerTool from "@/components/tools/pdf/PdfPageOrganizerTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfPageOrganizerWorkspace({
  toolId,
  mode,
  title,
  description,
}) {
  const [output, setOutput] = useState(null);

  const result = output?.result;

  let metadata = [];

  if (result && mode === "delete") {
    metadata = [
      {
        label: "Original pages",
        value: result.originalPageCount,
      },
      {
        label: "Deleted",
        value: result.deletedPages.join(", "),
      },
      {
        label: "Output pages",
        value: result.outputPageCount,
      },
      {
        label: "Output size",
        value: formatBytes(result.outputSize),
      },
    ];
  }

  if (result && mode === "reorder") {
    metadata = [
      {
        label: "Pages",
        value: result.pageCount,
      },
      {
        label: "New order",
        value: result.pageOrder.join(", "),
      },
      {
        label: "Output size",
        value: formatBytes(result.outputSize),
      },
    ];
  }

  if (result && mode === "rotate") {
    metadata = [
      {
        label: "Rotated pages",
        value: result.selectedPages.join(", "),
      },
      {
        label: "Rotation",
        value: `${result.degrees}°`,
      },
      {
        label: "Pages",
        value: result.pageCount,
      },
      {
        label: "Output size",
        value: formatBytes(result.outputSize),
      },
    ];
  }

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title={
          mode === "delete"
            ? "Pages deleted"
            : mode === "reorder"
              ? "Pages reordered"
              : "Pages rotated"
        }
        description="Your updated PDF is ready to download."
        metadata={metadata}
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
      toolId={toolId}
      title={title}
      description={description}
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <PdfPageOrganizerTool mode={mode} onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
