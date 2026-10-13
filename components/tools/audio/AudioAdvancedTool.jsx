"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";

import { getAudioDuration } from "@/lib/audio/ffmpegAudio";
import { processAdvancedAudio } from "@/lib/audio/advancedAudioEngine";
import { NOISE_PRESETS } from "@/lib/audio/audioAdvancedCommands";

const ALLOWED = ["mp3", "wav", "m4a", "ogg", "aac"];
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_SECONDS = 240;

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AudioAdvancedTool({ mode, onResultChange }) {
  const [tracks, setTracks] = useState([]);
  const [strength, setStrength] = useState("GENTLE");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const objectUrls = useRef(new Set());

  useEffect(() => {
    const urls = objectUrls.current;

    return () => {
      for (const url of urls) {
        URL.revokeObjectURL(url);
      }
      urls.clear();
    };
  }, []);

  function clearResult() {
    setError("");
    setProgress(0);
    onResultChange?.(null);
  }

  function releaseTrack(track) {
    URL.revokeObjectURL(track.previewUrl);
    objectUrls.current.delete(track.previewUrl);
  }

  async function handleFiles(files) {
    if (processing) return;

    const incoming = mode === "MERGE" ? files : files.slice(0, 1);

    if (!incoming.length) return;

    if (mode === "MERGE" && tracks.length + incoming.length > 4) {
      setError("Merge supports a maximum of 4 audio files.");
      return;
    }

    const prepared = [];

    try {
      for (const file of incoming) {
        const extension = file.name.split(".").pop()?.toLowerCase();

        if (!ALLOWED.includes(extension)) {
          throw new Error("Use MP3, WAV, M4A, OGG or AAC.");
        }

        if (!file.size || file.size > MAX_FILE_BYTES) {
          throw new Error(`${file.name}: use a file smaller than 15 MB.`);
        }

        const duration = await getAudioDuration(file);

        const previewUrl = URL.createObjectURL(file);
        objectUrls.current.add(previewUrl);

        prepared.push({
          id: crypto.randomUUID(),
          file,
          duration,
          previewUrl,
        });
      }

      const nextTracks = mode === "MERGE" ? [...tracks, ...prepared] : prepared;

      const totalBytes = nextTracks.reduce(
        (sum, track) => sum + track.file.size,
        0,
      );

      const totalDuration = nextTracks.reduce(
        (sum, track) => sum + track.duration,
        0,
      );

      if (totalBytes > MAX_TOTAL_BYTES || totalDuration > MAX_TOTAL_SECONDS) {
        throw new Error("Keep combined inputs below 30 MB and 4 minutes.");
      }

      if (mode !== "MERGE") {
        tracks.forEach(releaseTrack);
      }

      setTracks(nextTracks);
      clearResult();
    } catch (selectionError) {
      prepared.forEach(releaseTrack);

      setError(
        selectionError instanceof Error
          ? selectionError.message
          : "Could not read the audio files.",
      );
    }
  }

  function removeTrack(index) {
    if (processing) return;

    releaseTrack(tracks[index]);

    setTracks((current) =>
      current.filter((_, trackIndex) => trackIndex !== index),
    );

    clearResult();
  }

  function moveTrack(index, direction) {
    if (processing) return;

    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= tracks.length) {
      return;
    }

    setTracks((current) => {
      const next = [...current];

      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

      return next;
    });

    clearResult();
  }

  async function handleProcess() {
    if (processing) return;

    if (
      (mode === "MERGE" && tracks.length < 2) ||
      (mode !== "MERGE" && tracks.length !== 1)
    ) {
      setError(
        mode === "MERGE"
          ? "Select at least two audio clips."
          : "Select one audio file.",
      );
      return;
    }

    try {
      setProcessing(true);
      clearResult();

      const result = await processAdvancedAudio({
        files: tracks.map((track) => track.file),
        operation: mode,
        strength,
        onProgress: setProgress,
      });

      const url = URL.createObjectURL(result.blob);

      onResultChange?.({
        ...result,
        url,
        originalDuration: tracks.reduce(
          (sum, track) => sum + track.duration,
          0,
        ),
      });

      setProgress(100);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : "Audio processing failed.",
      );
    } finally {
      setProcessing(false);
    }
  }

  const totalDuration = tracks.reduce((sum, track) => sum + track.duration, 0);

  return (
    <div className="space-y-6">
      {tracks.length > 0 && (
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">
                {mode === "MERGE" ? "Clip order" : "Source audio"}
              </h3>

              <p className="mt-1 text-sm text-muted">
                {tracks.length} file(s) · {totalDuration.toFixed(2)} sec
              </p>
            </div>

            <button
              type="button"
              disabled={processing}
              onClick={() => {
                tracks.forEach(releaseTrack);
                setTracks([]);
                clearResult();
              }}
              className="min-h-11 rounded-xl border border-border px-4 text-sm font-semibold disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          <div className="mt-5 space-y-4">
            {tracks.map((track, index) => (
              <div
                key={track.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {mode === "MERGE" ? `${index + 1}. ` : ""}
                      {track.file.name}
                    </p>

                    <p className="mt-1 text-xs text-muted">
                      {formatMb(track.file.size)} · {track.duration.toFixed(2)}{" "}
                      sec
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => removeTrack(index)}
                    aria-label={`Remove ${track.file.name}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-red-600 disabled:opacity-50"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <audio
                  src={track.previewUrl}
                  controls
                  preload="metadata"
                  className="mt-4 w-full"
                />

                {mode === "MERGE" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={processing || index === 0}
                      onClick={() => moveTrack(index, -1)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-40"
                    >
                      <ArrowUp size={16} /> Up
                    </button>

                    <button
                      type="button"
                      disabled={processing || index === tracks.length - 1}
                      onClick={() => moveTrack(index, 1)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold disabled:opacity-40"
                    >
                      <ArrowDown size={16} /> Down
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {(mode === "MERGE" ? tracks.length < 4 : tracks.length === 0) && (
        <FileDropzone
          accept=".mp3,.wav,.m4a,.ogg,.aac"
          multiple={mode === "MERGE"}
          maxSizeBytes={MAX_FILE_BYTES}
          disabled={processing}
          onFilesSelected={handleFiles}
          title={mode === "MERGE" ? "Add audio clips" : "Choose an audio file"}
          description={
            mode === "MERGE"
              ? "Add 2–4 clips. Reorder them before merging."
              : "MP3, WAV, M4A, OGG or AAC · max 15 MB."
          }
        />
      )}

      {mode === "MERGE" && (
        <p className="text-sm leading-6 text-muted">
          Audio clips are normalized to the same sample format, then joined in
          your selected order without adding intentional silence.
        </p>
      )}

      {mode === "NORMALIZE" && tracks.length > 0 && (
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="font-semibold">Loudness preset</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Target: -16 LUFS, maximum true peak: -2 dBTP. Preview the result and
            compare with the original.
          </p>
        </div>
      )}

      {mode === "DENOISE" && tracks.length > 0 && (
        <section className="rounded-2xl border border-border bg-background p-5">
          <h3 className="font-semibold">Noise reduction strength</h3>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {NOISE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                disabled={processing}
                onClick={() => {
                  setStrength(preset.id);
                  clearResult();
                }}
                className={`rounded-xl border p-4 text-left disabled:opacity-50 ${
                  strength === preset.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface"
                }`}
              >
                <p className="font-semibold">{preset.name}</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-muted">
            Designed for steady noise in speech recordings. It may not remove
            conversations, sudden sounds, or all background music. Compare both
            previews.
          </p>
        </section>
      )}

      <button
        type="button"
        disabled={
          processing ||
          (mode === "MERGE" ? tracks.length < 2 : tracks.length !== 1)
        }
        onClick={handleProcess}
        className="min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {processing
          ? "Processing Audio..."
          : mode === "MERGE"
            ? "Merge Audio"
            : mode === "NORMALIZE"
              ? "Normalize Volume"
              : "Clean Up Noise"}
      </button>

      {processing && (
        <ProgressPanel
          status="PROCESSING"
          progress={progress}
          message="Processing locally with FFmpeg. Large files may take longer."
        />
      )}

      {!processing && error && <ProgressPanel status="ERROR" message={error} />}
    </div>
  );
}
