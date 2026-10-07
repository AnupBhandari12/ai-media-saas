"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import ExtractAudioTool from "@/components/tools/video/ExtractAudioTool";
import AudioTransformResult from "@/components/tools/video/AudioTransformResult";

export default function ExtractAudioWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-11"
      title="Extract Audio"
      description="Extract the complete audio track from a video as MP3, M4A, or WAV."
      result={result ? <AudioTransformResult result={result} /> : null}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <ExtractAudioTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
