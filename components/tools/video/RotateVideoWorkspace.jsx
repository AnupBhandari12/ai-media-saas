"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import RotateVideoTool from "@/components/tools/video/RotateVideoTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function RotateVideoWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-09"
      title="Rotate Video"
      description="Rotate video clockwise by 90, 180, or 270 degrees."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title="Video rotated"
            description="The rotated MP4 is ready to preview and download."
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <RotateVideoTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
