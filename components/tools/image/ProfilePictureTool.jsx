"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import { createProfilePicture } from "@/lib/tools/image/createProfilePicture";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const SIZE_PRESETS = [256, 512, 1024];

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createOutputFilename(file, mimeType, size) {
  const lastDotIndex = file.name.lastIndexOf(".");

  const baseName =
    lastDotIndex > 0 ? file.name.slice(0, lastDotIndex) : file.name;

  const extension = mimeType === "image/png" ? "png" : "jpg";

  return `${baseName}-profile-${size}x${size}.${extension}`;
}

export default function ProfilePictureTool({ onResultChange }) {
  const [file, setFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [error, setError] = useState("");

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  const [size, setSize] = useState(512);

  const [zoom, setZoom] = useState(1);

  const [horizontalPosition, setHorizontalPosition] = useState(50);

  const [verticalPosition, setVerticalPosition] = useState(50);

  const [outputMimeType, setOutputMimeType] = useState("image/jpeg");

  const [isProcessing, setIsProcessing] = useState(false);

  const [resultUrl, setResultUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function clearResult() {
    setError("");
    setResultUrl("");
    onResultChange?.(null);
  }

  async function handleFilesSelected(files) {
    const selectedFile = files[0];

    if (!selectedFile) {
      return;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("Image must be 10 MB or smaller.");
      return;
    }

    try {
      const bitmap = await createImageBitmap(selectedFile);

      const objectUrl = URL.createObjectURL(selectedFile);

      setFile(selectedFile);
      setPreviewUrl(objectUrl);

      setDimensions({
        width: bitmap.width,
        height: bitmap.height,
      });

      setSize(512);
      setZoom(1);
      setHorizontalPosition(50);
      setVerticalPosition(50);
      setOutputMimeType("image/jpeg");

      setError("");
      setResultUrl("");

      onResultChange?.(null);

      bitmap.close();
    } catch {
      setError("The selected image could not be read.");
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setPreviewUrl("");

    setDimensions({
      width: 0,
      height: 0,
    });

    setError("");
    setResultUrl("");

    onResultChange?.(null);
  }

  async function handleCreate() {
    if (!file || isProcessing) {
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setResultUrl("");

      onResultChange?.(null);

      const result = await createProfilePicture(file, {
        size,
        zoom,
        horizontalPosition,
        verticalPosition,
        outputMimeType,
      });

      const objectUrl = URL.createObjectURL(result.blob);

      setResultUrl(objectUrl);

      onResultChange?.({
        result,

        resultUrl: objectUrl,

        filename: createOutputFilename(file, result.mimeType, size),
      });
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Something went wrong while creating the profile picture.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!file) {
    return (
      <div>
        <FileDropzone
          accept="image/jpeg,image/png,image/webp"
          maxSizeBytes={MAX_FILE_SIZE}
          onFilesSelected={handleFilesSelected}
          title="Choose your photo"
          description="JPG, PNG, or WebP up to 10 MB."
        />

        {error && (
          <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="relative min-h-64 bg-slate-50">
          <Image
            src={previewUrl}
            alt={file.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-4"
          />
        </div>

        <div className="border-t border-border p-4">
          <p className="truncate font-semibold text-foreground">{file.name}</p>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
            <span>{formatBytes(file.size)}</span>

            <span>
              {dimensions.width} × {dimensions.height}px
            </span>
          </div>

          <button
            type="button"
            onClick={handleRemoveFile}
            className="mt-4 min-h-11 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
          >
            Choose another photo
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold text-foreground">Output size</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {SIZE_PRESETS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setSize(item);
                clearResult();
              }}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold ${
                size === item
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              {item}px
            </button>
          ))}
        </div>

        <div className="mt-6">
          <p className="font-semibold text-foreground">Profile preview</p>

          <p className="mt-1 text-xs text-muted">
            Circle preview shows how the picture may appear on social profiles.
            Downloaded image remains square.
          </p>

          <div className="mx-auto mt-5 h-64 w-64 overflow-hidden rounded-full border-4 border-background bg-slate-100 shadow">
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src={previewUrl}
                alt="Profile preview"
                fill
                unoptimized
                sizes="256px"
                className="object-cover"
                style={{
                  objectPosition: `${horizontalPosition}% ${verticalPosition}%`,
                  transform: `scale(${zoom})`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">Zoom</span>

            <span className="font-semibold text-primary">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="1"
            max="2.5"
            step="0.05"
            value={zoom}
            onChange={(event) => {
              setZoom(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">
              Horizontal position
            </span>

            <span className="text-primary">{horizontalPosition}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={horizontalPosition}
            onChange={(event) => {
              setHorizontalPosition(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-foreground">
              Vertical position
            </span>

            <span className="text-primary">{verticalPosition}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={verticalPosition}
            onChange={(event) => {
              setVerticalPosition(Number(event.target.value));

              clearResult();
            }}
            className="mt-3 w-full accent-indigo-600"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setOutputMimeType("image/jpeg");
              clearResult();
            }}
            className={`min-h-11 rounded-xl border font-semibold ${
              outputMimeType === "image/jpeg"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            JPG
          </button>

          <button
            type="button"
            onClick={() => {
              setOutputMimeType("image/png");
              clearResult();
            }}
            className={`min-h-11 rounded-xl border font-semibold ${
              outputMimeType === "image/png"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface"
            }`}
          >
            PNG
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={isProcessing}
        className="mt-5 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing ? "Creating..." : "Create Profile Picture"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Creating your profile picture locally..."
          />
        </div>
      )}

      {!isProcessing && error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}

      {!isProcessing && resultUrl && (
        <div className="mt-4">
          <ProgressPanel
            status="SUCCESS"
            message="Profile picture created successfully."
          />
        </div>
      )}
    </div>
  );
}
