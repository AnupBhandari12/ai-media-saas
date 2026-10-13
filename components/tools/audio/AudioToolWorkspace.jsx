"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import AudioLocalTool from "@/components/tools/audio/AudioLocalTool";
import AudioResultPanel from "@/components/tools/audio/AudioResultPanel";

const CONFIG = {
  CONVERT: {
    id: "AUD-01",

    title: "Audio Format Converter",

    description:
      "Convert MP3, WAV, M4A, OGG and AAC audio into a selected output format.",
  },

  COMPRESS: {
    id: "AUD-02",

    title: "Compress Audio",

    description:
      "Reduce audio file size with predictable MP3 bitrate presets and actual before/after measurement.",
  },

  TRIM: {
    id: "AUD-03",

    title: "Trim Audio",

    description:
      "Choose exact start and end times and export only that section of the audio.",
  },
};

export default function AudioToolWorkspace({ mode }) {
  const [result, setResult] = useState(null);

  const config = CONFIG[mode];

  function handleResult(next) {
    setResult((current) => {
      if (current?.url && current.url !== next?.url) {
        URL.revokeObjectURL(current.url);
      }

      return next;
    });
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
        <AudioLocalTool mode={mode} onResultChange={handleResult} />
      </div>
    </ToolShell>
  );
}
