"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import ConvertVideoTool from "@/components/tools/video/ConvertVideoTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function ConvertVideoWorkspace({ uploadFolder }) {
  const [result, setResult] = useState(null);

  const resultContent = result ? (
    <VideoTransformResult
      result={result}
      title="Video converted"
      description="Your converted video is ready. Playback availability depends on browser support for the selected format."
    />
  ) : null;

  return (
    <ToolShell
      toolId="VID-03"
      title="Convert Video Format"
      description="Convert stored videos to MP4, WebM, or MOV using an allowlisted Cloudinary transformation."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <ConvertVideoTool
          uploadFolder={uploadFolder}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
