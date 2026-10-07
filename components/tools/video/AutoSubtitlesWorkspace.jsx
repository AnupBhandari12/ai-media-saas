"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import AutoSubtitlesTool from "@/components/tools/video/AutoSubtitlesTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function AutoSubtitlesWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-15"
      title="Auto Subtitles"
      description="Generate timed captions from speech, review and edit them, download VTT or SRT, and optionally burn the reviewed captions into the video."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title="Captioned video ready"
            description={`${result.captionCount} reviewed captions were burned into the video.`}
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <AutoSubtitlesTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onBurnResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
