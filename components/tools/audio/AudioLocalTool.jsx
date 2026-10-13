"use client";

import { useState } from "react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { AUDIO_BITRATES, AUDIO_FORMATS } from "@/lib/audio/audioCommands";

import { getAudioDuration, processAudio } from "@/lib/audio/ffmpegAudio";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = ["mp3", "wav", "m4a", "ogg", "aac"];

function getExtension(filename) {
  return filename.split(".").pop()?.toLowerCase();
}

export default function AudioLocalTool({ mode, onResultChange }) {
  const [source, setSource] = useState(null);

  const [format, setFormat] = useState("mp3");

  const [bitrate, setBitrate] = useState(96);

  const [start, setStart] = useState(0);

  const [end, setEnd] = useState(0);

  const [progress, setProgress] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);

  const [error, setError] = useState("");

  function clearResult() {
    setError("");
    setProgress(0);

    onResultChange?.(null);
  }

  async function handleFile(files) {
    const file = files?.[0];

    if (!file) {
      return;
    }

    const extension = getExtension(file.name);

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      setError("Use MP3, WAV, M4A, OGG, or AAC audio.");

      return;
    }

    try {
      setError("");

      const duration = await getAudioDuration(file);

      setSource({
        file,
        duration,
      });

      setStart(0);

      setEnd(Number(duration.toFixed(2)));

      clearResult();
    } catch (metadataError) {
      setError(
        metadataError instanceof Error
          ? metadataError.message
          : "Could not read this audio file.",
      );
    }
  }

  async function handleProcess() {
    if (!source || isProcessing) {
      return;
    }

    if (
      mode === "TRIM" &&
      (end <= start || start < 0 || end > source.duration + 0.05)
    ) {
      setError("Choose a valid start and end time.");

      return;
    }

    try {
      setIsProcessing(true);

      clearResult();

      const outputFormat = mode === "COMPRESS" ? "mp3" : format;

      const processed = await processAudio({
        file: source.file,

        operation: mode,

        format: outputFormat,

        bitrate,

        start,

        end,

        onProgress: setProgress,
      });

      const url = URL.createObjectURL(processed.blob);

      onResultChange?.({
        ...processed,

        url,

        originalBytes: source.file.size,

        originalDuration: source.duration,
      });

      setProgress(100);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Audio processing failed.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (!source) {
    return (
      <div>
        <FileDropzone
          accept=".mp3,.wav,.m4a,.ogg,.aac,audio/*"
          maxSizeBytes={MAX_AUDIO_BYTES}
          onFilesSelected={handleFile}
          disabled={isProcessing}
          title="Drop an audio file"
          description="MP3, WAV, M4A, OGG or AAC · maximum 25 MB."
        />

        {error && (
          <div className="mt-4">
            <ProgressPanel status="ERROR" message={error} />
          </div>
        )}
      </div>
    );
  }

  const trimDuration = Math.max(0, end - start);

  return (
    <div>
      <div className="rounded-2xl border border-border bg-background p-5">
        <p className="truncate font-semibold text-foreground">
          {source.file.name}
        </p>

        <p className="mt-2 text-sm text-muted">
          {(source.file.size / (1024 * 1024)).toFixed(2)} MB ·{" "}
          {source.duration.toFixed(2)} sec
        </p>

        <audio
          src={URL.createObjectURL(source.file)}
          controls
          className="mt-4 w-full"
        />

        <button
          type="button"
          onClick={() => {
            setSource(null);

            clearResult();
          }}
          className="mt-4 min-h-11 w-full rounded-xl border border-border text-sm font-semibold"
        >
          Change Audio
        </button>
      </div>

      {mode !== "COMPRESS" && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold">Output format</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {AUDIO_FORMATS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setFormat(item.value);

                  clearResult();
                }}
                className={`min-h-11 rounded-xl border font-semibold ${
                  format === item.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "COMPRESS" && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold">Compression bitrate</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AUDIO_BITRATES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setBitrate(item.value);

                  clearResult();
                }}
                className={`rounded-xl border p-4 text-left ${
                  bitrate === item.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface"
                }`}
              >
                <p className="font-semibold">{item.label}</p>

                <p className="mt-1 text-xs text-muted">{item.description}</p>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            Compression output is MP3 for predictable bitrate and compatibility.
          </p>
        </div>
      )}

      {mode === "TRIM" && (
        <div className="mt-6 rounded-2xl border border-border bg-background p-5">
          <p className="font-semibold">Trim range</p>

          <label className="mt-4 block text-sm font-semibold">
            Start (sec)
            <input
              type="number"
              min="0"
              max={source.duration}
              step="0.1"
              value={start}
              onChange={(event) => {
                setStart(Number(event.target.value));

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
            />
          </label>

          <label className="mt-4 block text-sm font-semibold">
            End (sec)
            <input
              type="number"
              min="0.1"
              max={source.duration}
              step="0.1"
              value={end}
              onChange={(event) => {
                setEnd(Number(event.target.value));

                clearResult();
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
            />
          </label>

          <p className="mt-4 rounded-xl bg-primary/10 p-3 text-sm font-semibold text-primary">
            Expected duration: {trimDuration.toFixed(2)} sec
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={isProcessing}
        onClick={handleProcess}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isProcessing
          ? "Processing Audio..."
          : mode === "CONVERT"
            ? "Convert Audio"
            : mode === "COMPRESS"
              ? "Compress Audio"
              : "Trim Audio"}
      </button>

      {isProcessing && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            progress={progress}
            message="Processing locally with FFmpeg..."
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
