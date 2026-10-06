"use client";

import { useState } from "react";

import { FolderArchive } from "lucide-react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import BulkWatermarkTool from "@/components/tools/creator/BulkWatermarkTool";

export default function BulkWatermarkWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Bulk watermark complete"
        description="All selected images were attempted. Successful outputs are ready individually and as a ZIP."
        metadata={[
          {
            label: "Selected",
            value: output.totalSelected,
          },
          {
            label: "Successful",
            value: output.successfulCount,
          },
          {
            label: "Failed",
            value: output.failedCount,
          },
          {
            label: "Type",
            value: output.settings.type === "logo" ? "Logo" : "Text",
          },
          {
            label: "Position",
            value: output.settings.position,
          },
        ]}
      >
        <div className="divide-y divide-border">
          {output.results.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold">
                  {item.originalName}
                </p>

                <span
                  className={`text-xs font-semibold ${
                    item.status === "SUCCESS"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              {item.error && (
                <p className="mt-2 text-xs text-red-600">{item.error}</p>
              )}
            </div>
          ))}
        </div>
      </ResultPanel>

      <DownloadGroup downloads={output.downloads} />

      <a
        href={output.zipUrl}
        download="ai-media-bulk-watermark.zip"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white"
      >
        <FolderArchive size={18} />
        Download All as ZIP
      </a>
    </div>
  ) : null;

  return (
    <ToolShell
      toolId="CRT-08"
      title="Bulk Watermark"
      description="Apply the same text or logo watermark to multiple images using optional Brand Kit defaults, then download individual results or one ZIP."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <BulkWatermarkTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
