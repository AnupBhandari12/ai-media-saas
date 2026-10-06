"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";
import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import ZipPackagerTool from "@/components/tools/creator/ZipPackagerTool";

export default function ZipPackagerWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <div className="space-y-4">
      <ResultPanel
        title="ZIP ready"
        description="Your selected files were packaged locally."
        metadata={[
          {
            label: "Files",
            value: output.fileCount,
          },
        ]}
      />

      <DownloadGroup
        downloads={[
          {
            name: output.filename,

            filename: output.filename,

            url: output.zipUrl,
          },
        ]}
      />
    </div>
  ) : null;

  return (
    <ToolShell
      toolId="CRT-02"
      title="Download All as ZIP"
      description="Package multiple local files into one ZIP with safe filenames and browser limits."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <ZipPackagerTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
