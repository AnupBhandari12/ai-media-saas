"use client";

import {
  useEffect,
  useState,
} from "react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import {
  VIDEO_WATERMARK_POSITIONS,
  brandPositionToVideo,
} from "@/lib/video/videoAdvancedPresets";

const DEFAULT_SETTINGS = {
  type: "TEXT",

  text:
    "AI Media",

  position:
    "BOTTOM_RIGHT",

  opacity: 60,

  sizePercent: 15,

  color:
    "#ffffff",
};

export default function VideoWatermarkTool({
  uploadFolder,
  initialVideo,
  onResultChange,
}) {
  const [
    video,
    setVideo,
  ] = useState(
    initialVideo
  );

  const [
    settings,
    setSettings,
  ] = useState(
    DEFAULT_SETTINGS
  );

  const [
    brandKit,
    setBrandKit,
  ] = useState(null);

  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadBrandKit() {
      try {
        const response =
          await fetch(
            "/api/brand-kit"
          );

        const data =
          await response.json();

        if (
          response.ok &&
          data.brandKit
        ) {
          setBrandKit(
            data.brandKit
          );

          setSettings({
            type:
              data.brandKit
                .defaultWatermarkType ===
              "LOGO"
                ? "LOGO"
                : "TEXT",

            text:
              data.brandKit
                .defaultWatermarkText ||
              data.brandKit
                .brandName ||
              "AI Media",

            position:
              brandPositionToVideo(
                data.brandKit
                  .defaultWatermarkPosition
              ),

            opacity:
              data.brandKit
                .defaultWatermarkOpacity,

            sizePercent:
              Math.min(
                35,
                Math.max(
                  5,
                  data.brandKit
                    .defaultWatermarkSize
                )
              ),

            color:
              "#ffffff",
          });
        }
      } catch {
        // Brand Kit is optional.
      }
    }

    loadBrandKit();
  }, []);

  function clearResult() {
    setError("");

    onResultChange?.(
      null
    );
  }

  function update(
    field,
    value
  ) {
    setSettings(
      (current) => ({
        ...current,

        [field]:
          value,
      })
    );

    clearResult();
  }

  async function handleProcess() {
    if (
      !video ||
      isProcessing
    ) {
      return;
    }

    if (
      settings.type ===
        "TEXT" &&
      !settings.text.trim()
    ) {
      setError(
        "Enter watermark text."
      );

      return;
    }

    if (
      settings.type ===
        "LOGO" &&
      !brandKit
        ?.logoSecureUrl
    ) {
      setError(
        "Save a Brand Kit logo before using logo watermark."
      );

      return;
    }

    try {
      setIsProcessing(
        true
      );

      clearResult();

      const response =
        await fetch(
          "/api/video/advanced-transform",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                operation:
                  "WATERMARK",

                mediaId:
                  video.id,

                ...settings,

                text:
                  settings.type ===
                  "TEXT"
                    ? settings.text.trim()
                    : null,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            "Video watermark failed."
        );
      }

      onResultChange?.(
        data.result
      );
    } catch (
      processingError
    ) {
      setError(
        processingError instanceof
          Error
          ? processingError.message
          : "Video watermark failed."
      );
    } finally {
      setIsProcessing(
        false
      );
    }
  }

  if (!video) {
    return (
      <VideoToolUpload
        uploadFolder={
          uploadFolder
        }
        onVideoReady={(
          nextVideo
        ) => {
          setVideo(
            nextVideo
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
        <p className="font-semibold">
          Watermark type
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              update(
                "type",
                "TEXT"
              )
            }
            className={`min-h-11 rounded-xl border font-semibold ${
              settings.type ===
              "TEXT"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Text
          </button>

          <button
            type="button"
            disabled={
              !brandKit
                ?.logoSecureUrl
            }
            onClick={() =>
              update(
                "type",
                "LOGO"
              )
            }
            className={`min-h-11 rounded-xl border font-semibold disabled:opacity-40 ${
              settings.type ===
              "LOGO"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            Brand Logo
          </button>
        </div>

        {settings.type ===
          "TEXT" && (
          <>
            <label className="mt-5 block text-sm font-semibold">
              Watermark text

              <input
                type="text"
                maxLength={
                  100
                }
                value={
                  settings.text
                }
                onChange={(
                  event
                ) =>
                  update(
                    "text",
                    event.target
                      .value
                  )
                }
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Text color

              <input
                type="color"
                value={
                  settings.color
                }
                onChange={(
                  event
                ) =>
                  update(
                    "color",
                    event.target
                      .value
                  )
                }
                className="mt-2 h-11 w-full rounded-xl border border-border p-1"
              />
            </label>
          </>
        )}

        {settings.type ===
          "LOGO" &&
          brandKit
            ?.logoSecureUrl && (
            <div className="mt-5 rounded-xl border border-border bg-surface p-4">
              <p className="text-sm font-semibold">
                Using saved Brand Kit logo
              </p>

              <div
                role="img"
                aria-label="Brand logo"
                className="mt-3 h-20 bg-contain bg-left-center bg-no-repeat"
                style={{
                  backgroundImage:
                    `url("${brandKit.logoSecureUrl}")`,
                }}
              />
            </div>
          )}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">
          Position
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {VIDEO_WATERMARK_POSITIONS.map(
            (
              item
            ) => (
              <button
                key={
                  item.value
                }
                type="button"
                onClick={() =>
                  update(
                    "position",
                    item.value
                  )
                }
                className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                  settings.position ===
                  item.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface"
                }`}
              >
                {
                  item.label
                }
              </button>
            )
          )}
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span>
              Opacity
            </span>

            <span>
              {
                settings.opacity
              }
              %
            </span>
          </div>

          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={
              settings.opacity
            }
            onChange={(
              event
            ) =>
              update(
                "opacity",
                Number(
                  event.target
                    .value
                )
              )
            }
            className="mt-2 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span>
              Size
            </span>

            <span>
              {
                settings.sizePercent
              }
              %
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="35"
            step="1"
            value={
              settings.sizePercent
            }
            onChange={(
              event
            ) =>
              update(
                "sizePercent",
                Number(
                  event.target
                    .value
                )
              )
            }
            className="mt-2 w-full accent-indigo-600"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={
          handleProcess
        }
        disabled={
          isProcessing
        }
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Applying Watermark..."
          : "Create Watermarked Video"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={
              false
            }
            message="Applying watermark across the full video..."
          />
        </div>
      )}

      {!isProcessing &&
        error && (
          <div className="mt-4">
            <ProgressPanel
              status="ERROR"
              message={
                error
              }
            />
          </div>
        )}
    </div>
  );
}