"use client";

import { useState } from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

const DEFAULT_CROP = {
  left: 10,
  top: 10,
  width: 80,
  height: 80,
};

export default function CropVideoTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [crop, setCrop] = useState(DEFAULT_CROP);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");

    onResultChange?.(null);
  }

  function updateCrop(field, value) {
    const number = Number(value);

    setCrop((current) => {
      const next = {
        ...current,
        [field]: number,
      };

      if (field === "left") {
        next.left = Math.min(number, 100 - current.width);
      }

      if (field === "top") {
        next.top = Math.min(number, 100 - current.height);
      }

      if (field === "width") {
        next.width = Math.min(number, 100 - current.left);
      }

      if (field === "height") {
        next.height = Math.min(number, 100 - current.top);
      }

      return next;
    });

    clearResult();
  }

  async function handleCrop() {
    if (!video || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const response = await fetch("/api/video/advanced-transform", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          operation: "CROP",

          mediaId: video.id,

          ...crop,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Video crop failed.");
      }

      onResultChange?.(data.result);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Video crop failed.",
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

          setCrop(DEFAULT_CROP);

          clearResult();
        }}
      />
    );
  }

  const outputWidth = video.width
    ? Math.round(video.width * (crop.width / 100))
    : null;

  const outputHeight = video.height
    ? Math.round(video.height * (crop.height / 100))
    : null;

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
        <p className="font-semibold">Crop preview</p>

        <div
          className="relative mt-4 overflow-hidden rounded-xl bg-black"
          style={{
            aspectRatio:
              video.width && video.height
                ? `${video.width}/${video.height}`
                : "16/9",
          }}
        >
          <video
            src={video.secureUrl}
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-contain"
          />

          <div
            className="pointer-events-none absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
            style={{
              left: `${crop.left}%`,

              top: `${crop.top}%`,

              width: `${crop.width}%`,

              height: `${crop.height}%`,
            }}
          />
        </div>

        {outputWidth && outputHeight && (
          <p className="mt-3 text-center text-sm font-semibold text-primary">
            Output ≈ {outputWidth} × {outputHeight}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Crop region</p>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Left</span>

            <span>{crop.left}%</span>
          </div>

          <input
            type="range"
            min="0"
            max={100 - crop.width}
            value={crop.left}
            onChange={(event) => updateCrop("left", event.target.value)}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Top</span>

            <span>{crop.top}%</span>
          </div>

          <input
            type="range"
            min="0"
            max={100 - crop.height}
            value={crop.top}
            onChange={(event) => updateCrop("top", event.target.value)}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Width</span>

            <span>{crop.width}%</span>
          </div>

          <input
            type="range"
            min="5"
            max={100 - crop.left}
            value={crop.width}
            onChange={(event) => updateCrop("width", event.target.value)}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-5">
          <div className="flex justify-between text-sm">
            <span>Height</span>

            <span>{crop.height}%</span>
          </div>

          <input
            type="range"
            min="5"
            max={100 - crop.top}
            value={crop.height}
            onChange={(event) => updateCrop("height", event.target.value)}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setCrop({
              left: 0,
              top: 0,
              width: 100,
              height: 100,
            });

            clearResult();
          }}
          className="mt-5 min-h-11 w-full rounded-xl border border-border text-sm font-semibold"
        >
          Reset Full Frame
        </button>
      </div>

      <button
        type="button"
        onClick={handleCrop}
        disabled={isProcessing}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Cropping Video..." : "Crop Video"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating the selected crop region..."
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
