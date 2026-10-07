"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import { VIDEO_COMPRESS_PRESETS } from "@/lib/video/videoPresets";

export default function CompressVideoTool({ uploadFolder, onResultChange }) {
  const [video, setVideo] = useState(null);

  const [preset, setPreset] = useState("BALANCED");

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");

    onResultChange?.(null);
  }

  async function handleCompress() {
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
          operation: "COMPRESS",

          mediaId: video.id,

          preset,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Video compression failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Video compression failed.",
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
        <p className="font-semibold text-foreground">Compression preset</p>

        <div className="mt-4 grid gap-3">
          {Object.entries(VIDEO_COMPRESS_PRESETS).map(([value, option]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPreset(value);

                clearResult();
              }}
              className={`rounded-xl border p-4 text-left ${
                preset === value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold text-foreground">{option.label}</p>

              <p className="mt-1 text-xs leading-5 text-muted">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleCompress}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Compressing & Measuring..." : "Compress Video"}
      </button>

      <p className="mt-2 text-center text-xs text-muted">
        Cloudinary processes the video and AI Media measures the actual result
        size.
      </p>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Compressing video and measuring the transformed output..."
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
