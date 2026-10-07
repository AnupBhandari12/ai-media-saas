"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

export default function MuteVideoTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");

    onResultChange?.(null);
  }

  async function handleMute() {
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
          operation: "MUTE",

          mediaId: video.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not remove audio.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Could not remove audio.",
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
        <p className="font-semibold text-foreground">Remove audio track</p>

        <p className="mt-2 text-sm leading-6 text-muted">
          This creates a new silent MP4. Your original uploaded video remains
          unchanged.
        </p>
      </div>

      <button
        type="button"
        onClick={handleMute}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Removing Audio..." : "Create Silent Video"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Removing the audio track..."
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
