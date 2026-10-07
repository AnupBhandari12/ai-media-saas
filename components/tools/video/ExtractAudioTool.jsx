"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import {
  AUDIO_FORMATS,
  AUDIO_QUALITY_PRESETS,
} from "@/lib/video/videoToolPresets";

export default function ExtractAudioTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [format, setFormat] = useState("mp3");

  const [quality, setQuality] = useState("BALANCED");

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");
    onResultChange?.(null);
  }

  async function handleExtract() {
    if (!video || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      clearResult();

      const response = await fetch("/api/video/transform", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          operation: "EXTRACT_AUDIO",

          mediaId: video.id,

          format,
          quality,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Audio extraction failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Audio extraction failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!video) {
    return (
      <VideoToolUpload
        uploadFolder={uploadFolder}
        onVideoReady={(nextVideo) => {
          setVideo(nextVideo);
          clearResult();
        }}
      />
    );
  }

  return (
    <div>
      <VideoSourceCard
        video={video}
        onChangeVideo={() => {
          setVideo(null);
          clearResult();
        }}
      />

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Audio format</p>

        <div className="mt-4 grid gap-3">
          {AUDIO_FORMATS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setFormat(item.value);
                clearResult();
              }}
              className={`rounded-xl border p-4 text-left ${
                format === item.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold">{item.label}</p>

              <p className="mt-2 text-xs leading-5 text-muted">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Audio quality</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {AUDIO_QUALITY_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setQuality(item.id);
                clearResult();
              }}
              className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                quality === item.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleExtract}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Extracting Audio..."
          : `Extract ${format.toUpperCase()}`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Extracting the video audio track..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}
    </div>
  );
}
