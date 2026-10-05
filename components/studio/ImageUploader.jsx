"use client";

import { useEffect, useState } from "react";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { Upload } from "lucide-react";

import ImageTransformer from "@/components/studio/ImageTransformer";

export default function ImageUploader({ initialImage = null, uploadFolder }) {
  const [uploadedImage, setUploadedImage] = useState(initialImage);
  const [saveError, setSaveError] = useState("");

  const [imageUsage, setImageUsage] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  useEffect(() => {
    async function loadUsage() {
      try {
        const response = await fetch("/api/usage");
        const data = await response.json();

        if (response.ok) {
          setImageUsage(data.images);
        }
      } catch (error) {
        console.error("Failed to load image usage:", error);
      } finally {
        setQuotaLoading(false);
      }
    }

    loadUsage();
  }, []);

  const imageLimitReached = imageUsage?.remaining === 0;

  return (
    <div>
      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        options={{
          sources: ["local"],
          multiple: false,
          resourceType: "image",
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "avif"],
          maxFileSize: 10_000_000,
          maxImageWidth: 4096,
          maxImageHeight: 4096,
          folder: uploadFolder,
        }}
        onSuccess={async (result, { widget }) => {
          if (typeof result?.info === "string") {
            return;
          }

          const info = result.info;

          setUploadedImage(info);
          setSaveError("");
          widget.close();

          try {
            const response = await fetch("/api/media", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "IMAGE",
                originalFilename: info.original_filename,
                cloudinaryPublicId: info.public_id,
                secureUrl: info.secure_url,
                format: info.format,
                bytes: info.bytes,
                width: info.width,
                height: info.height,
              }),
            });

            const data = await response.json();

            if (!response.ok) {
              throw new Error(data.error || "Failed to save media.");
            }

            setImageUsage((currentUsage) => {
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
              error instanceof Error
                ? error.message
                : "Image uploaded successfully, but it could not be saved to your media library.",
            );
          }
        }}
      >
        {({ open }) => (
          <button
            type="button"
            onClick={() => open()}
            disabled={quotaLoading || imageLimitReached}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload size={18} />

            {imageLimitReached ? "Monthly Image Limit Reached" : "Upload Image"}
          </button>
        )}
      </CldUploadWidget>

      {imageUsage && (
        <p
          className={`mt-3 text-sm ${
            imageLimitReached ? "font-medium text-red-600" : "text-muted"
          }`}
        >
          {imageUsage.used} / {imageUsage.limit} image uploads used this month
        </p>
      )}

      {saveError && (
        <p className="mt-4 text-sm font-medium text-red-600">{saveError}</p>
      )}

      {uploadedImage && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-4">
          <CldImage
            src={uploadedImage.public_id}
            width={uploadedImage.width}
            height={uploadedImage.height}
            alt={uploadedImage.original_filename || "Uploaded image"}
            sizes="(max-width: 768px) 100vw, 672px"
            className="h-auto max-h-80 w-full rounded-xl object-contain"
          />

          <div className="mt-4">
            <p className="font-medium text-foreground">
              {uploadedImage.original_filename}
            </p>

            <p className="mt-1 text-sm text-muted">
              {uploadedImage.width} × {uploadedImage.height} ·{" "}
              {uploadedImage.format?.toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {uploadedImage && <ImageTransformer image={uploadedImage} />}
    </div>
  );
}
