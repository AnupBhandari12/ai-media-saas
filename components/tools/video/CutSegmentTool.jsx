"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

export default function CutSegmentTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [mode, setMode] = useState("KEEP");

  const [start, setStart] = useState(0);

  const [end, setEnd] = useState(
    initialVideo?.duration ? Math.min(5, Number(initialVideo.duration)) : 0,
  );

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");
    onResultChange?.(null);
  }

  function readyVideo(nextVideo) {
    const duration = Number(nextVideo.duration) || 0;

    setVideo(nextVideo);

    setStart(0);

    setEnd(Math.min(5, duration));

    clearResult();
  }

  const duration = Number(video?.duration) || 0;

  const valid =
    duration > 0 && start >= 0 && end > start && end <= duration + 0.05;

  const outputDuration =
    mode === "KEEP" ? end - start : duration - (end - start);

  async function handleProcess() {
    if (!video || !valid || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const response = await fetch("/api/video/cut-merge", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          operation: "CUT_SEGMENT",

          mediaId: video.id,

          mode,

          start: Number(start),

          end: Number(end),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Segment processing failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Segment processing failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!video) {
    return (
      <VideoToolUpload uploadFolder={uploadFolder} onVideoReady={readyVideo} />
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
        <p className="font-semibold">What should happen?</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setMode("KEEP");

              clearResult();
            }}
            className={`min-h-12 rounded-xl border font-semibold ${
              mode === "KEEP"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Keep Segment
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("REMOVE");

              clearResult();
            }}
            className={`min-h-12 rounded-xl border font-semibold ${
              mode === "REMOVE"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Remove Segment
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-muted">
          {mode === "KEEP"
            ? "Only the selected range will remain."
            : "The selected middle range will be removed and the remaining parts joined."}
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Timeline selection</p>

        <p className="mt-1 text-sm text-muted">
          Source: {duration.toFixed(2)} sec
        </p>

        <label className="mt-5 block text-sm font-semibold">
          Start (sec)
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
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
          />
        </label>

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
          className="mt-3 w-full accent-indigo-600"
        />

        <label className="mt-5 block text-sm font-semibold">
          End (sec)
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
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
          />
        </label>

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
          className="mt-3 w-full accent-indigo-600"
        />

        <div
          className={`mt-5 rounded-xl border p-4 text-sm ${
            valid
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {valid
            ? `Expected output duration: ${outputDuration.toFixed(2)} sec`
            : "Choose a valid range inside the source video."}
        </div>
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={!valid || isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Processing Segment..."
          : mode === "KEEP"
            ? "Keep Selected Segment"
            : "Remove Selected Segment"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Applying the selected timeline edit..."
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
