"use client";

import { useState } from "react";
import { CldImage, CldUploadWidget } from "next-cloudinary";
import { Upload } from "lucide-react";

export default function ImageUploader({ initialImage = null }) {
  const [uploadedImage, setUploadedImage] = useState(initialImage);
  const [saveError, setSaveError] = useState("");

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
          folder: "ai-media/images",
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
          } catch (error) {
            console.error(error);

            setSaveError(
              "Image uploaded successfully, but it could not be saved to your media library.",
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
            Upload Image
          </button>
        )}
      </CldUploadWidget>

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
    </div>
  );
}
