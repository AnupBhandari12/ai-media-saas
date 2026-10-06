"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import PdfToImageTool from "@/components/tools/pdf/PdfToImageTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function PdfToImageWorkspace({
  toolId,
  format,
  title,
  description,
}) {
  const [output, setOutput] = useState(null);

  const formatLabel = format === "jpg" ? "JPG" : "PNG";

  function downloadZip() {
    if (!output?.zipUrl) {
      return;
    }

    const link = document.createElement("a");

    link.href = output.zipUrl;

    link.download = `ai-media-pdf-to-${format}.zip`;

    document.body.appendChild(link);

    link.click();

    link.remove();
  }

  const firstResult = output?.results?.[0];

  const firstPreview = output?.resultUrls?.[0];

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title={`${formatLabel} conversion complete`}
        description={`${output.convertedPageCount} PDF page${output.convertedPageCount === 1 ? "" : "s"} converted successfully.`}
        metadata={[
          {
            label: "Converted pages",
            value: output.convertedPageCount,
          },
          {
            label: "PDF pages",
            value: output.pageCount,
          },
          {
            label: "Format",
            value: formatLabel,
          },
          {
            label: "Render scale",
            value: `${output.scale}×`,
          },
          {
            label: "PDF size",
            value: formatBytes(output.originalSize),
          },
          {
            label: "Images total",
            value: formatBytes(output.outputSize),
          },
        ]}
      >
        {firstPreview && firstResult && (
          <div>
            <div className="relative min-h-72 bg-slate-50">
              <Image
                src={firstPreview}
                alt={`PDF page ${firstResult.pageNumber} preview`}
                fill
                unoptimized
                sizes="(max-width: 1280px) 100vw, 40vw"
                className="object-contain p-4"
              />
            </div>

            <div className="border-t border-border p-4">
              <p className="text-sm font-semibold text-foreground">
                Preview: page {firstResult.pageNumber}
              </p>

              <p className="mt-1 text-xs text-muted">
                {firstResult.width} × {firstResult.height}
                px · {formatBytes(firstResult.size)}
              </p>
            </div>
          </div>
        )}

        {output.results.length > 1 && (
          <div className="border-t border-border">
            {output.results.map((item) => (
              <div
                key={item.filename}
                className="flex items-center justify-between gap-4 border-b border-border p-4 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    Page {item.pageNumber}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {item.width} × {item.height}
                    px
                  </p>
                </div>

                <span className="shrink-0 text-xs font-medium text-muted">
                  {formatBytes(item.size)}
                </span>
              </div>
            ))}
          </div>
        )}
      </ResultPanel>

      <DownloadGroup
        downloads={output.downloads}
        zipLabel={`Download All ${formatLabel} as ZIP`}
        onDownloadAll={output.convertedPageCount > 1 ? downloadZip : undefined}
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
        <PdfToImageTool format={format} onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
