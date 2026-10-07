"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

const FORMATS = [
  {
    value: "mp4",
    label: "MP4",
    description:
      "Best general compatibility for browsers, phones, and social platforms.",
  },

  {
    value: "webm",
    label: "WebM",
    description: "Modern web-friendly container with strong browser support.",
  },

  {
    value: "mov",
    label: "MOV",
    description:
      "Useful for Apple/editing workflows. Browser preview support can vary.",
  },
];

export default function ConvertVideoTool({ uploadFolder, onResultChange }) {
  const [video, setVideo] = useState(null);

  const [format, setFormat] = useState("mp4");

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");

    onResultChange?.(null);
  }

  async function handleConvert() {
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
          operation: "CONVERT",

          mediaId: video.id,

          format,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Video conversion failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Video conversion failed.",
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
        <p className="font-semibold text-foreground">Output format</p>

        <div className="mt-4 grid gap-3">
          {FORMATS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFormat(option.value);

                clearResult();
              }}
              className={`rounded-xl border p-4 text-left ${
                format === option.value
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

        {format === "mov" && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            MOV is mainly a download/editing format. Browser playback support
            depends on the browser and codec.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleConvert}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Converting Video..."
          : `Convert to ${format.toUpperCase()}`}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message={`Converting video to ${format.toUpperCase()}...`}
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
