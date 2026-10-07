"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import VideoWatermarkTool from "@/components/tools/video/VideoWatermarkTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function VideoWatermarkWorkspace({
  uploadFolder,
  initialVideo,
}) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-14"
      title="Video Watermark"
      description="Apply text or your saved Brand Kit logo to a video with safe positioning and opacity controls."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title="Watermarked video ready"
            description="The watermark was applied across the full video."
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <VideoWatermarkTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
