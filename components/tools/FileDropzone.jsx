"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";

export default function FileDropzone({
  accept = "",
  multiple = false,
  maxSizeBytes = null,
  onFilesSelected,
  disabled = false,
  title = "Drop your file here",
  description = "Drag and drop a file, or browse from your device.",
}) {
  const inputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  function validateFiles(fileList) {
    const selectedFiles = Array.from(fileList);

    if (!multiple && selectedFiles.length > 1) {
      return {
        valid: false,
        message: "Please select only one file.",
      };
    }

    if (maxSizeBytes) {
      const oversizedFile = selectedFiles.find(
        (file) => file.size > maxSizeBytes
      );

      if (oversizedFile) {
        return {
          valid: false,
          message: `"${oversizedFile.name}" is larger than the allowed file size.`,
        };
      }
    }

    return {
      valid: true,
      files: selectedFiles,
    };
  }

  function handleFiles(fileList) {
    if (!fileList?.length) {
      return;
    }

    const validation = validateFiles(fileList);

    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setError("");

    if (onFilesSelected) {
      onFilesSelected(validation.files);
    }
  }

  function handleDrop(event) {
    event.preventDefault();

    if (disabled) {
      return;
    }

    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();

          if (!disabled) {
            setIsDragging(true);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`flex min-h-56 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-background hover:border-primary/50"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <FileUp size={22} />
        </div>

        <p className="mt-4 font-semibold text-foreground">
          {title}
        </p>

        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          {description}
        </p>

        <span className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground">
          Browse Files
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          handleFiles(event.target.files);

          event.target.value = "";
        }}
        className="hidden"
      />

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}