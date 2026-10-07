"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

function getInitialTime(video) {
  const duration = Number(video?.duration) || 0;

  if (duration <= 0) {
    return 0;
  }

  return Number((duration / 2).toFixed(1));
}

export default function FrameExtractorTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [time, setTime] = useState(() => getInitialTime(initialVideo));

  const [format, setFormat] = useState("jpg");

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");

    onResultChange?.(null);
  }

  function handleVideoReady(nextVideo) {
    setVideo(nextVideo);

    setTime(getInitialTime(nextVideo));

    clearResult();
  }

  const duration = Number(video?.duration) || 0;

  const maxTime = Math.max(0, duration - 0.1);

  const timeValid = duration > 0 && time >= 0 && time <= duration;

  async function handleExtract() {
    if (!video || !timeValid || isProcessing) {
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
          operation: "FRAME",

          mediaId: video.id,

          time: Number(time),

          format,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Frame extraction failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Frame extraction failed.",
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
          setTime(0);

          clearResult();
        }}
      />

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Select timestamp</p>

        <p className="mt-1 text-sm text-muted">
          Video duration: {duration.toFixed(1)} sec
        </p>

        <div className="mt-5 flex items-center justify-between text-sm">
          <span>Frame time</span>

          <span className="font-semibold text-primary">
            {Number(time).toFixed(1)}s
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={maxTime}
          step="0.1"
          value={time}
          onChange={(event) => {
            setTime(Number(event.target.value));

            clearResult();
          }}
          className="mt-3 w-full accent-indigo-600"
        />

        <label className="mt-5 block text-sm font-semibold">
          Exact time (sec)
          <input
            type="number"
            min="0"
            max={duration}
            step="0.1"
            value={time}
            onChange={(event) => {
              setTime(Number(event.target.value));

              clearResult();
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4 outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Image format</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["jpg", "JPG"],
            ["png", "PNG"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFormat(value);

                clearResult();
              }}
              className={`min-h-11 rounded-xl border font-semibold ${
                format === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleExtract}
        disabled={!timeValid || isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Extracting Frame..."
          : `Extract Frame at ${Number(time).toFixed(1)}s`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Extracting the selected video frame..."
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
