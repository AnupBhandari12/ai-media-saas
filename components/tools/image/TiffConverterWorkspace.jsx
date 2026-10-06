"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import TiffConverterTool from "@/components/tools/image/TiffConverterTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function TiffConverterWorkspace() {
  const [output, setOutput] = useState(null);

  function downloadZip() {
    if (!output?.zipUrl) {
      return;
    }

    const link = document.createElement("a");

    link.href = output.zipUrl;

    link.download = "ai-media-tiff-pages.zip";

    document.body.appendChild(link);

    link.click();
    link.remove();
  }

  const outputTotal =
    output?.pages.reduce((sum, page) => sum + page.outputSize, 0) || 0;

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="TIFF converted"
        description={`${output.pageCount} page${output.pageCount === 1 ? "" : "s"} converted successfully.`}
        metadata={[
          {
            label: "Pages",
            value: output.pageCount,
          },
          {
            label: "Output format",
            value: output.outputMimeType,
          },
          {
            label: "Original size",
            value: formatBytes(output.originalSize),
          },
          {
            label: "Output total",
            value: formatBytes(outputTotal),
          },
        ]}
      >
        {output.pageUrls[0] && (
          <div className="relative min-h-72 bg-slate-50">
            <Image
              src={output.pageUrls[0]}
              alt="Converted TIFF preview"
              fill
              unoptimized
              sizes="(max-width: 1280px) 100vw, 40vw"
              className="object-contain p-4"
            />
          </div>
        )}

        {output.pages.length > 1 && (
          <div className="border-t border-border">
            {output.pages.map((page) => (
              <div
                key={page.filename}
                className="border-b border-border p-4 last:border-b-0"
              >
                <p className="truncate text-sm font-semibold text-foreground">
                  {page.filename}
                </p>

                <p className="mt-1 text-xs text-muted">
                  {page.width} × {page.height}px ·{" "}
                  {formatBytes(page.outputSize)}
                </p>
              </div>
            ))}
          </div>
        )}
      </ResultPanel>

      <DownloadGroup
        downloads={output.downloads}
        zipLabel="Download Pages as ZIP"
        onDownloadAll={output.pageCount > 1 ? downloadZip : undefined}
      />
    </div>
  ) : null;

  return (
    <ToolShell
      toolId="IMG-07"
      title="TIFF to PNG / JPG"
      description="Convert TIFF scans and images into broadly compatible PNG or JPG files, including bounded multi-page TIFF support."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <TiffConverterTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
