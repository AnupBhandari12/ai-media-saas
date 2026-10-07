"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import MuteVideoTool from "@/components/tools/video/MuteVideoTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function MuteVideoWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-10"
      title="Mute / Remove Audio"
      description="Create a silent MP4 by removing the source video's audio track."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title="Silent video ready"
            description="The output video contains no audio track."
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <MuteVideoTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
