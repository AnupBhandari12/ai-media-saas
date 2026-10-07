"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import CropVideoTool from "@/components/tools/video/CropVideoTool";
import VideoTransformResult from "@/components/tools/video/VideoTransformResult";

export default function CropVideoWorkspace({ uploadFolder, initialVideo }) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-08"
      title="Crop Video"
      description="Select a manual video region and export only that exact area."
      result={
        result ? (
          <VideoTransformResult
            result={result}
            title="Video cropped"
            description="The exported video contains the selected crop region."
          />
        ) : null
      }
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <CropVideoTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
