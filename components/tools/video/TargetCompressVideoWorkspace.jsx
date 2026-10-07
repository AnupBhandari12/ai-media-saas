"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import TargetCompressVideoTool from "@/components/tools/video/TargetCompressVideoTool";
import TargetCompressResult from "@/components/tools/video/TargetCompressResult";

export default function TargetCompressVideoWorkspace({
  uploadFolder,
  initialVideo,
}) {
  const [result, setResult] = useState(null);

  return (
    <ToolShell
      toolId="VID-02"
      title="Compress Video to Target MB"
      description="Aim for a requested video file size using measured iterative bitrate compression."
      result={result ? <TargetCompressResult result={result} /> : null}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.CLOUD} />

      <div className="mt-6">
        <TargetCompressVideoTool
          uploadFolder={uploadFolder}
          initialVideo={initialVideo}
          onResultChange={setResult}
        />
      </div>
    </ToolShell>
  );
}
