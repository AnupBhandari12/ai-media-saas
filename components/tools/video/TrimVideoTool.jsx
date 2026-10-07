"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

export default function TrimVideoTool({ uploadFolder, onResultChange }) {
  const [video, setVideo] = useState(null);

  const [start, setStart] = useState(0);

  const [end, setEnd] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");

    onResultChange?.(null);
  }

  function handleVideoReady(nextVideo) {
    const duration = Number(nextVideo.duration) || 0;

    setVideo(nextVideo);

    setStart(0);

    setEnd(Number(duration.toFixed(2)));

    clearResult();
  }

  const duration = Number(video?.duration) || 0;

  const selectedDuration = Math.max(0, end - start);

  const rangeValid =
    duration > 0 && start >= 0 && end > start && end <= duration + 0.05;

  async function handleTrim() {
    if (!video || !rangeValid || isProcessing) {
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
          operation: "TRIM",

          mediaId: video.id,

          start: Number(start),

          end: Number(end),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Video trim failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Video trim failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!video) {
    return (
      <VideoToolUpload
        uploadFolder={uploadFolder}
        onVideoReady={handleVideoReady}
      />
    );
  }

  return (
    <div>
      <VideoSourceCard
        video={video}
        onChangeVideo={() => {
          setVideo(null);
          setStart(0);
          setEnd(0);

          clearResult();
        }}
      />

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Trim range</p>

        <p className="mt-1 text-sm text-muted">
          Source duration: {duration.toFixed(2)} sec
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Start time (sec)
            <input
              type="number"
              min="0"
              max={duration}
              step="0.1"
              value={start}
              onChange={(event) => {
                setStart(Number(event.target.value));

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
            />
          </label>

          <label className="text-sm font-semibold">
            End time (sec)
            <input
              type="number"
              min="0.1"
              max={duration}
              step="0.1"
              value={end}
              onChange={(event) => {
                setEnd(Number(event.target.value));

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Start</span>

            <span className="font-semibold text-primary">
              {start.toFixed(1)}s
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={Math.max(0, end - 0.1)}
            step="0.1"
            value={start}
            onChange={(event) => {
              setStart(Number(event.target.value));

              clearResult();
            }}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>End</span>

            <span className="font-semibold text-primary">
              {end.toFixed(1)}s
            </span>
          </div>

          <input
            type="range"
            min={Math.min(duration, start + 0.1)}
            max={duration}
            step="0.1"
            value={end}
            onChange={(event) => {
              setEnd(Number(event.target.value));

              clearResult();
            }}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div
          className={`mt-5 rounded-xl border p-4 text-sm ${
            rangeValid
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {rangeValid
            ? `Output duration: ${selectedDuration.toFixed(2)} sec`
            : "Choose a valid start/end range inside the source duration."}
        </div>
      </div>

      <button
        type="button"
        onClick={handleTrim}
        disabled={!rangeValid || isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Trimming Video..."
          : `Trim to ${selectedDuration.toFixed(1)} sec`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating the selected video range..."
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
