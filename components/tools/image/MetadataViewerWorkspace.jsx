"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import MetadataViewerTool from "@/components/tools/image/MetadataViewerTool";

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
    1: "Normal",
    2: "Mirrored horizontal",
    3: "Rotated 180°",
    4: "Mirrored vertical",
    5: "Mirrored + 90°",
    6: "Rotated 90°",
    7: "Mirrored + 270°",
    8: "Rotated 270°",
  };

  return labels[orientation] || "Not available";
}

export default function MetadataViewerWorkspace() {
  const [output, setOutput] = useState(null);

  const metadata = output?.metadata;

  const metadataItems = metadata
    ? [
        {
          label: "File name",
          value: metadata.fileName,
        },
        {
          label: "File type",
          value: metadata.mimeType,
        },
        {
          label: "File size",
          value: formatBytes(metadata.size),
        },
        {
          label: "Dimensions",
          value: `${metadata.width} × ${metadata.height}px`,
        },
        {
          label: "Last modified",
          value: metadata.lastModified || "Not available",
        },
        {
          label: "EXIF detected",
          value: metadata.hasExif ? "Yes" : "No",
        },
        {
          label: "GPS detected",
          value: metadata.hasGps ? "Yes" : "No",
        },
        {
          label: "Camera make",
          value: metadata.make || "Not available",
        },
        {
          label: "Camera model",
          value: metadata.model || "Not available",
        },
        {
          label: "Photo date",
          value:
            metadata.dateTimeOriginal || metadata.dateTime || "Not available",
        },
        {
          label: "Orientation",
          value: orientationLabel(metadata.orientation),
        },
        {
          label: "GPS coordinates",
          value:
            Number.isFinite(metadata.latitude) &&
            Number.isFinite(metadata.longitude)
              ? `${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(
                  6,
                )}`
              : "Not available",
        },
      ]
    : [];

  const resultContent = output ? (
    <ResultPanel
      title="Metadata inspected"
      description={
        metadata.detailedExifSupported
          ? "File details and supported JPEG EXIF fields were read locally."
          : "Basic file and image details were read locally. Detailed EXIF parsing is currently available for JPEG images."
      }
      metadata={metadataItems}
    >
      <div className="relative min-h-72 bg-slate-50">
        <Image
          src={output.previewUrl}
          alt="Metadata image preview"
          fill
          unoptimized
          sizes="(max-width: 1280px) 100vw, 40vw"
          className="object-contain p-4"
        />
      </div>
    </ResultPanel>
  ) : null;

  return (
    <ToolShell
      toolId="IMG-13"
      title="View Image Metadata"
      description="Inspect image dimensions, file information, and supported EXIF or GPS metadata locally in your browser."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <MetadataViewerTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
