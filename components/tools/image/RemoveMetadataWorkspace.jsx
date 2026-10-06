"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import RemoveMetadataTool from "@/components/tools/image/RemoveMetadataTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function RemoveMetadataWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Metadata removed"
        description="A newly encoded copy has been created from the visible image pixels."
        metadata={[
          {
            label: "Original size",
            value: formatBytes(output.result.originalSize),
          },
          {
            label: "Cleaned size",
            value: formatBytes(output.result.outputSize),
          },
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}px`,
          },
          {
            label: "EXIF before",
            value: output.originalMetadata?.detailedExifSupported
              ? output.originalMetadata.hasExif
                ? "Detected"
                : "Not detected"
              : "Not fully inspected",
          },
          {
            label: "GPS before",
            value: output.originalMetadata?.detailedExifSupported
              ? output.originalMetadata.hasGps
                ? "Detected"
                : "Not detected"
              : "Not fully inspected",
          },
          {
            label: "Format",
            value: output.result.mimeType,
          },
        ]}
      >
        <div className="relative min-h-72 bg-slate-50">
          <Image
            src={output.resultUrl}
            alt="Metadata-clean image"
            fill
            unoptimized
            sizes="(max-width: 1280px) 100vw, 40vw"
            className="object-contain p-4"
          />
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
      toolId="IMG-14"
      title="Remove EXIF / GPS Metadata"
      description="Create a privacy-clean copy of your image by re-encoding the visible pixels locally in your browser."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <RemoveMetadataTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
