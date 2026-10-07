"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import {
  GIF_FPS_PRESETS,
  GIF_WIDTH_PRESETS,
} from "@/lib/video/videoToolPresets";

export default function VideoGifTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [start, setStart] = useState(0);

  const [duration, setDuration] = useState(4);

  const [width, setWidth] = useState(480);

  const [fps, setFps] = useState(10);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");
    onResultChange?.(null);
  }

  const sourceDuration = Number(video?.duration) || 0;

  const valid =
    sourceDuration > 0 &&
    start >= 0 &&
    duration >= 1 &&
    duration <= 8 &&
    start + duration <= sourceDuration + 0.05;

  async function handleCreate() {
    if (!video || !valid || isProcessing) {
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
          operation: "GIF",

          mediaId: video.id,

          start,
          duration,
          width,
          fps,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "GIF generation failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "GIF generation failed.",
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

          setStart(0);

          setDuration(
            Math.min(4, Math.max(1, Number(nextVideo.duration) || 1)),
          );

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
        <p className="font-semibold">Clip range</p>

        <label className="mt-4 block text-sm font-semibold">
          Start time (sec)
          <input
            type="number"
            min="0"
            max={sourceDuration}
            step="0.1"
            value={start}
            onChange={(event) => {
              setStart(Number(event.target.value));
              clearResult();
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          GIF duration (1–8 sec)
          <input
            type="number"
            min="1"
            max="8"
            step="1"
            value={duration}
            onChange={(event) => {
              setDuration(Number(event.target.value));
              clearResult();
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
          />
        </label>

        {!valid && (
          <p className="mt-4 text-sm font-medium text-red-600">
            Keep the selected GIF range inside the source video.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">GIF width</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {GIF_WIDTH_PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setWidth(item.value);
                clearResult();
              }}
              className={`min-h-11 rounded-xl border text-sm font-semibold ${
                width === item.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="mt-6 font-semibold">Frame rate</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {GIF_FPS_PRESETS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setFps(item.value);
                clearResult();
              }}
              className={`min-h-11 rounded-xl border text-sm font-semibold ${
                fps === item.value
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
        onClick={handleCreate}
        disabled={!valid || isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Creating GIF..." : "Create GIF"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating a bounded looping GIF..."
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
