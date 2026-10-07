"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import {
  SOCIAL_VIDEO_PRESETS,
  VIDEO_GRAVITIES,
  VIDEO_RESIZE_MODES,
} from "@/lib/video/videoToolPresets";

export default function SocialVideoTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [preset, setPreset] = useState("VERTICAL");

  const [mode, setMode] = useState("FILL");

  const [gravity, setGravity] = useState("CENTER");

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

    try {
      setIsProcessing(true);
      clearResult();

      const response = await fetch("/api/video/transform", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          operation: "SOCIAL_RESIZE",

          mediaId: video.id,

          preset,

          mode,

          gravity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Social video processing failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Social video processing failed.",
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
        <p className="font-semibold text-foreground">Social size</p>

        <div className="mt-4 grid gap-3">
          {SOCIAL_VIDEO_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setPreset(item.id);

                clearResult();
              }}
              className={`rounded-xl border p-4 text-left ${
                preset === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold">{item.name}</p>

              <p className="mt-1 text-xs text-muted">
                {item.width} × {item.height} · {item.aspectRatio}
              </p>

              <p className="mt-2 text-xs leading-5 text-muted">
                {item.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Fit behavior</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {VIDEO_RESIZE_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);

                clearResult();
              }}
              className={`rounded-xl border p-4 text-left ${
                mode === item.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <p className="font-semibold">{item.name}</p>

              <p className="mt-2 text-xs leading-5 text-muted">
                {item.description}
              </p>
            </button>
          ))}
        </div>

        {mode === "FILL" && (
          <>
            <p className="mt-6 text-sm font-semibold">Crop focus</p>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {VIDEO_GRAVITIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setGravity(item.id);

                    clearResult();
                  }}
                  className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                    gravity === item.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleProcess}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Creating Social Video..." : "Create Social Video"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Resizing video without stretching..."
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
