"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import { VIDEO_ROTATIONS } from "@/lib/video/videoToolPresets";

export default function RotateVideoTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [angle, setAngle] = useState(90);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");

    onResultChange?.(null);
  }

  async function handleRotate() {
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
          operation: "ROTATE",

          mediaId: video.id,

          angle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Video rotation failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Video rotation failed.",
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
        <p className="font-semibold">Rotation</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {VIDEO_ROTATIONS.map((item) => (
            <button
              key={item.angle}
              type="button"
              onClick={() => {
                setAngle(item.angle);

                clearResult();
              }}
              className={`min-h-12 rounded-xl border font-semibold ${
                angle === item.angle
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
        onClick={handleRotate}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Rotating Video..." : `Rotate ${angle}°`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message={`Rotating video ${angle} degrees...`}
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
