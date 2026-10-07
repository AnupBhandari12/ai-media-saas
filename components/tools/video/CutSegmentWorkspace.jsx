"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import CutSegmentTool from "@/components/tools/video/CutSegmentTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function CutSegmentWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-05"
      title="Cut Video Segment"
      description="Keep one selected range or remove a selected section from the middle of a video."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title={
              result.mode === "REMOVE" ? "Segment removed" : "Segment kept"
            }
            description="The output follows the selected timeline range."
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <CutSegmentTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
