"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import { TARGET_VIDEO_SIZE_PRESETS } from "@/lib/video/videoToolPresets";

export default function TargetCompressVideoTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [targetMb, setTargetMb] = useState(10);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");
    onResultChange?.(null);
  }

  async function handleProcess() {
    if (!video || isProcessing) {
      return;
    }

    if (targetMb < 1 || targetMb > 40) {
      setError("Target must be between 1 MB and 40 MB.");

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
          operation: "TARGET_COMPRESS",

          mediaId: video.id,

          targetMb: Number(targetMb),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Target compression failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Target compression failed.",
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
        <p className="font-semibold">Target size</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TARGET_VIDEO_SIZE_PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setTargetMb(item.value);
                clearResult();
              }}
              className={`rounded-xl border p-4 text-left ${
                targetMb === item.value
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

        <label className="mt-5 block text-sm font-semibold">
          Custom target (MB)
          <input
            type="number"
            min="1"
            max="40"
            step="1"
            value={targetMb}
            onChange={(event) => {
              setTargetMb(Number(event.target.value));

              clearResult();
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
          />
        </label>

        <p className="mt-4 text-xs leading-5 text-muted">
          AI Media estimates a bitrate, measures the actual Cloudinary result,
          and retries up to three times when useful.
        </p>
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Compressing & Measuring..."
          : `Compress toward ${targetMb} MB`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Estimating bitrate, encoding, measuring and adjusting..."
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
