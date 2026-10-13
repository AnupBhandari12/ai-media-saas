"use client";

import { useEffect, useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import AudioLocalTool from "@/components/tools/audio/AudioLocalTool";
import AudioAdvancedTool from "@/components/tools/audio/AudioAdvancedTool";
import AudioResultPanel from "@/components/tools/audio/AudioResultPanel";

const CONFIG = {
  CONVERT: {
    id: "AUD-01",
    title: "Audio Format Converter",
    description:
      "Convert MP3, WAV, M4A, OGG and AAC audio into common formats.",
  },

  COMPRESS: {
    id: "AUD-02",
    title: "Compress Audio",
    description: "Reduce audio file size using bitrate presets.",
  },

  TRIM: {
    id: "AUD-03",
    title: "Trim Audio",
    description: "Select start and end times to export a section.",
  },

  MERGE: {
    id: "AUD-04",
    title: "Merge Audio",
    description: "Combine 2–4 clips in the order you choose.",
  },

  NORMALIZE: {
    id: "AUD-05",
    title: "Normalize Volume",
    description: "Balance loudness using a controlled FFmpeg preset.",
  },

  DENOISE: {
    id: "AUD-06",
    title: "Noise Cleanup",
    description: "Reduce steady background noise from speech recordings.",
  },
};

export default function AudioToolWorkspace({ mode }) {
  const [result, setResult] = useState(null);

  const config = CONFIG[mode];
  const advanced = ["MERGE", "NORMALIZE", "DENOISE"].includes(mode);

  useEffect(() => {
    const resultUrl = result?.url;

    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [result?.url]);

  if (!config) {
    return <p>Unknown audio operation.</p>;
  }

  return (
    <ToolShell
      toolId={config.id}
      title={config.title}
      description={config.description}
      result={result ? <AudioResultPanel result={result} /> : null}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        {advanced ? (
          <AudioAdvancedTool mode={mode} onResultChange={setResult} />
        ) : (
          <AudioLocalTool mode={mode} onResultChange={setResult} />
        )}
      </div>
    </ToolShell>
  );
}
