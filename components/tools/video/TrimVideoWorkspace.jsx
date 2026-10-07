"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import TrimVideoTool from "@/components/tools/video/TrimVideoTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function TrimVideoWorkspace({ uploadFolder }) {
  const [result, setResult] = useState(null);

  const resultContent = result ? (
    <VideoTransformResult
      result={result}
      title="Video trimmed"
      description="The output contains only the selected start/end range."
    />
  ) : null;

  return (
    <ToolShell
      toolId="VID-04"
      title="Trim Video"
      description="Choose exact start and end times and create a trimmed MP4."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <TrimVideoTool uploadFolder={uploadFolder} onResultChange={setResult} />
      </div>
    </ToolShell>
  );
}
