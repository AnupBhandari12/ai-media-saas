"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import MergeVideosTool from "@/components/tools/video/MergeVideosTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function MergeVideosWorkspace({ uploadFolder }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-06"
      title="Merge Videos"
      description="Combine 2–4 videos in a chosen order while normalizing dimensions and output codecs."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title="Merged video ready"
            description={`${result.clipCount} clips were combined in the selected order.`}
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <MergeVideosTool
          uploadFolder={uploadFolder}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
