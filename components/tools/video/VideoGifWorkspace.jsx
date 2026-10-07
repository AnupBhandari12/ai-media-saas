"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import VideoGifTool from "@/components/tools/video/VideoGifTool";
import GifResult from "@/components/tools/video/GifResult";

export default function VideoGifWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-13"
      title="Video to GIF"
      description="Turn a short video segment into a size-controlled looping GIF."
      result={result ? <GifResult result={result} /> : null}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <VideoGifTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
