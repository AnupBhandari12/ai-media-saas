"use client";

import { useEffect, useState } from "react";

import { CldUploadWidget } from "next-cloudinary";

import { Upload } from "lucide-react";

export default function VideoToolUpload({ uploadFolder, onVideoReady }) {
  const [usage, setUsage] = useState(null);

  const [quotaLoading, setQuotaLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsage() {
      try {
        const response = await fetch("/api/usage");

        const data = await response.json();

        if (response.ok) {
          setUsage(data.videos);
        }
      } catch {
        // Upload still works if usage
        // display cannot load.
      } finally {
        setQuotaLoading(false);
      }
    }

    loadUsage();
  }, []);

  const limitReached = usage?.remaining === 0;

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

          try {
            setIsSaving(true);
            setError("");

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
              throw new Error(data.error || "Could not save uploaded video.");
            }

            const media = data.media;

            onVideoReady?.({
              id: media.id,

              publicId: media.cloudinaryPublicId,

              secureUrl: media.secureUrl,

              filename: media.originalFilename,

              format: media.format,

              bytes: media.bytes,

              width: media.width,

              height: media.height,

              duration: media.duration,
            });

            setUsage((current) => {
              if (!current) {
                return current;
              }

              return {
                ...current,

                used: current.used + 1,

                remaining: Math.max(current.remaining - 1, 0),
              };
            });

            widget.close();
          } catch (saveError) {
            setError(
              saveError instanceof Error
                ? saveError.message
                : "Video could not be saved.",
            );
          } finally {
            setIsSaving(false);
          }
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            disabled={quotaLoading || limitReached || isSaving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={18} />

            {isSaving
              ? "Saving Video..."
              : limitReached
                ? "Monthly Video Limit Reached"
                : "Upload Video"}
          </button>
        )}
      </CldUploadWidget>

      <p className="mt-3 text-center text-xs text-muted">
        MP4, MOV or WebM · up to 50 MB
      </p>

      {usage && (
        <p className="mt-2 text-center text-xs text-muted">
          {usage.used} / {usage.limit} video uploads used this month
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
