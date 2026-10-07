"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import SmartPreviewTool from "@/components/tools/video/SmartPreviewTool";
import SmartPreviewResult from "@/components/tools/video/SmartPreviewResult";

export default function SmartPreviewWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-16"
      title="Short Smart Preview"
      description="Generate a compact preview clip while always keeping the original video available."
      result={result ? <SmartPreviewResult result={result} /> : null}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <SmartPreviewTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
