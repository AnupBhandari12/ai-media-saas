"use client";

import { useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { Upload } from "lucide-react";
import VideoOptimizer from "@/components/studio/VideoOptimizer";

export default function VideoUploader({ initialVideo = null }) {
  const [uploadedVideo, setUploadedVideo] = useState(initialVideo);
  const [saveError, setSaveError] = useState("");

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
          folder: "ai-media/videos",
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
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover"
          >
            <Upload size={18} />
            Upload Video
          </button>
        )}
      </CldUploadWidget>

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
