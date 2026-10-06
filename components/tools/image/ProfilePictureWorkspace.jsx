"use client";

import Image from "next/image";
import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import ProfilePictureTool from "@/components/tools/image/ProfilePictureTool";

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ProfilePictureWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="Profile picture ready"
        description="Your square profile image is ready to download."
        metadata={[
          {
            label: "Dimensions",
            value: `${output.result.width} × ${output.result.height}px`,
          },
          {
            label: "Zoom",
            value: `${Math.round(output.result.zoom * 100)}%`,
          },
          {
            label: "Horizontal",
            value: `${output.result.horizontalPosition}%`,
          },
          {
            label: "Vertical",
            value: `${output.result.verticalPosition}%`,
          },
          {
            label: "Output size",
            value: formatBytes(output.result.outputSize),
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
            alt="Profile picture result"
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
      toolId="IMG-11"
      title="Profile Picture Maker"
      description="Create clean square profile pictures for social media, portfolios, and professional accounts."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <ProfilePictureTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
