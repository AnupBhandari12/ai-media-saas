"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import SocialVideoTool from "@/components/tools/video/SocialVideoTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function SocialVideoWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-07"
      title="Resize / Social Video"
      description="Create 9:16, 1:1, or 16:9 video outputs using crop-to-fill or fit-with-bars without stretching."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title="Social video ready"
            description="Your video was resized while preserving its aspect ratio."
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <SocialVideoTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
