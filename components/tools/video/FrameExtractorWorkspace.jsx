"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import FrameExtractorTool from "@/components/tools/video/FrameExtractorTool";
import VideoFrameResult from "@/components/tools/video/VideoFrameResult";

export default function FrameExtractorWorkspace({
  uploadFolder,
  initialVideo,
}) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-12"
      title="Thumbnail / Frame Extractor"
      description="Choose a timestamp and export that exact video frame as JPG or PNG."
      result={result ? <VideoFrameResult result={result} /> : null}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <FrameExtractorTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
