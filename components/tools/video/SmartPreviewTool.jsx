"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import { SMART_PREVIEW_DURATIONS } from "@/lib/video/videoToolPresets";

export default function SmartPreviewTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [duration, setDuration] = useState(5);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");
    onResultChange?.(null);
  }

  async function handleCreate() {
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
          operation: "SMART_PREVIEW",

          mediaId: video.id,

          duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Preview generation failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Preview generation failed.",
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
        <p className="font-semibold">Preview duration</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {SMART_PREVIEW_DURATIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setDuration(item.value);
                clearResult();
              }}
              className={`min-h-11 rounded-xl border text-sm font-semibold ${
                duration === item.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-muted">
          AI Media first asks Cloudinary for an AI-based interesting preview. If
          that preview is not ready immediately, it safely falls back to a
          compact middle clip.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Creating Preview..." : "Create Smart Preview"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Generating an AI preview or safe fallback clip..."
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
