"use client";

import { useEffect, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { Upload } from "lucide-react";

import VideoOptimizer from "@/components/studio/VideoOptimizer";

export default function VideoUploader({ initialVideo = null, uploadFolder }) {
  const [uploadedVideo, setUploadedVideo] = useState(initialVideo);
  const [saveError, setSaveError] = useState("");

  const [videoUsage, setVideoUsage] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  useEffect(() => {
    async function loadUsage() {
      try {
        const response = await fetch("/api/usage");
        const data = await response.json();

        if (response.ok) {
          setVideoUsage(data.videos);
        }
      } catch (error) {
        console.error("Failed to load video usage:", error);
      } finally {
        setQuotaLoading(false);
      }
    }

    loadUsage();
  }, []);

  const videoLimitReached = videoUsage?.remaining === 0;

  return (
    <div>
      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        options={{
          sources: ["local"],
          multiple: false,
          resourceType: "video",
          clientAllowedFormats: ["mp4", "mov", "webm"],
          maxFileSize: 50_000_000,
          folder: uploadFolder,
        }}
        onSuccess={async (result, { widget }) => {
          if (typeof result?.info === "string") {
            return;
          }

          const info = result.info;

          setUploadedVideo(info);
          setSaveError("");
          widget.close();

          try {
            const response = await fetch("/api/media", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "VIDEO",
                originalFilename: info.original_filename,
                cloudinaryPublicId: info.public_id,
                secureUrl: info.secure_url,
                format: info.format,
                bytes: info.bytes,
                width: info.width,
                height: info.height,
                duration: info.duration,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Failed to save video.");
            }

            setVideoUsage((currentUsage) => {
              if (!currentUsage) {
                return currentUsage;
              }

              return {
                ...currentUsage,
                used: currentUsage.used + 1,
                remaining: Math.max(currentUsage.remaining - 1, 0),
              };
            });
          } catch (error) {
            console.error(error);

            setSaveError(
              "Video uploaded successfully, but it could not be saved to your media library.",
            );
          }
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            disabled={quotaLoading || videoLimitReached}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={18} />

            {videoLimitReached ? "Monthly Video Limit Reached" : "Upload Video"}
          </button>
        )}
      </CldUploadWidget>

      {videoUsage && (
        <p
          className={`mt-3 text-sm ${
            videoLimitReached ? "font-medium text-red-600" : "text-muted"
          }`}
        >
          {videoUsage.used} / {videoUsage.limit} video uploads used this month
        </p>
      )}

      {saveError && (
        <p className="mt-4 text-sm font-medium text-red-600">{saveError}</p>
      )}

      {uploadedVideo && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-4">
          <video
            src={uploadedVideo.secure_url}
            controls
            className="w-full rounded-xl bg-black"
          />

          <div className="mt-4">
            <p className="font-medium text-foreground">
              {uploadedVideo.original_filename}
            </p>

            <p className="mt-1 text-sm text-muted">
              {uploadedVideo.format?.toUpperCase()}

              {uploadedVideo.duration
                ? ` · ${uploadedVideo.duration.toFixed(1)} sec`
                : ""}

              {uploadedVideo.bytes
                ? ` · ${(uploadedVideo.bytes / 1024 / 1024).toFixed(2)} MB`
                : ""}
            </p>
          </div>
        </div>
      )}

      {uploadedVideo && <VideoOptimizer video={uploadedVideo} />}
    </div>
  );
}
