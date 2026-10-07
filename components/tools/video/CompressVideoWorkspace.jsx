"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import CompressVideoTool from "@/components/tools/video/CompressVideoTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function CompressVideoWorkspace({ uploadFolder }) {
  const [result, setResult] = useState(null);

  const resultContent = result ? (
    <VideoTransformResult
      result={result}
      title="Video compressed"
      description="The transformed file was measured after Cloudinary processing."
    />
  ) : null;

  return (
    <ToolShell
      toolId="VID-01"
      title="Compress Video"
      description="Reduce video file size using practical Cloudinary quality presets with real output-size measurement."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <CompressVideoTool
          uploadFolder={uploadFolder}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
