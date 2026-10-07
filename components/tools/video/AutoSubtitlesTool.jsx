"use client";

import { useState } from "react";

import { Download, Plus, Trash2 } from "lucide-react";

import ProgressPanel from "@/components/tools/ProgressPanel";

import VideoToolUpload from "@/components/tools/video/VideoToolUpload";
import VideoSourceCard from "@/components/tools/video/VideoSourceCard";

import {
  cueListIsValid,
  cuesToSrt,
  cuesToVtt,
} from "@/lib/video/subtitleUtils";

const LANGUAGE_OPTIONS = [
  {
    value: "AUTO",
    label: "Auto Detect",
  },

  {
    value: "en",
    label: "English",
  },

  {
    value: "ne",
    label: "Nepali",
  },

  {
    value: "hi",
    label: "Hindi",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadText(content, filename, type) {
  const blob = new Blob([content], {
    type,
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function baseName(filename) {
  if (!filename) {
    return "captions";
  }

  const dot = filename.lastIndexOf(".");

  return dot > 0 ? filename.slice(0, dot) : filename;
}

export default function AutoSubtitlesTool({
  uploadFolder,
  initialVideo,
  onBurnResultChange,
}) {
  const [video, setVideo] = useState(initialVideo);

  const [language, setLanguage] = useState("AUTO");

  const [jobId, setJobId] = useState("");

  const [cues, setCues] = useState([]);

  const [isGenerating, setIsGenerating] = useState(false);

  const [isBurning, setIsBurning] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");

  const [error, setError] = useState("");

  const [style, setStyle] = useState({
    fontSize: 32,

    color: "#ffffff",

    position: "BOTTOM",
  });

  function resetCaptions() {
    setJobId("");
    setCues([]);
    setStatusMessage("");
    setError("");

    onBurnResultChange?.(null);
  }

  function handleVideoReady(nextVideo) {
    setVideo(nextVideo);

    resetCaptions();
  }

  async function checkStatus(id) {
    const response = await fetch("/api/video/subtitles", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        action: "STATUS",

        jobId: id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not check transcription status.");
    }

    return data;
  }

  async function pollJob(id) {
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await sleep(5000);

      const data = await checkStatus(id);

      if (data.status === "COMPLETED") {
        setCues(data.cues || []);

        setStatusMessage(
          data.cues?.length
            ? `${data.cues.length} timed captions ready for review.`
            : "Transcription completed, but no spoken captions were detected.",
        );

        return true;
      }

      setStatusMessage("Transcription is still processing...");
    }

    setStatusMessage(
      "Transcription is still running. Use Check Again in a moment.",
    );

    return false;
  }

  async function handleGenerate(regenerate = false) {
    if (!video || isGenerating) {
      return;
    }

    try {
      setIsGenerating(true);

      setError("");
      setCues([]);

      onBurnResultChange?.(null);

      setStatusMessage("Starting transcription...");

      const response = await fetch("/api/video/subtitles", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "START",

          mediaId: video.id,

          language,

          regenerate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not start transcription.");
      }

      setJobId(data.jobId);

      if (data.status === "COMPLETED") {
        setCues(data.cues || []);

        setStatusMessage(
          data.cues?.length
            ? `${data.cues.length} timed captions loaded.`
            : "Transcript completed with no detected speech.",
        );

        return;
      }

      setStatusMessage("Cloudinary is transcribing the video...");

      await pollJob(data.jobId);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Subtitle generation failed.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCheckAgain() {
    if (!jobId || isGenerating) {
      return;
    }

    try {
      setIsGenerating(true);

      setError("");

      const data = await checkStatus(jobId);

      if (data.status === "COMPLETED") {
        setCues(data.cues || []);

        setStatusMessage(
          data.cues?.length
            ? `${data.cues.length} timed captions ready for review.`
            : "No spoken captions were detected.",
        );

        return;
      }

      setStatusMessage("Still processing. Check again shortly.");
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Could not check transcription.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function updateCue(index, field, value) {
    setCues((current) =>
      current.map((cue, cueIndex) =>
        cueIndex === index
          ? {
              ...cue,

              [field]: field === "text" ? value : Number(value),
            }
          : cue,
      ),
    );

    onBurnResultChange?.(null);
  }

  function removeCue(index) {
    setCues((current) => current.filter((_, cueIndex) => cueIndex !== index));

    onBurnResultChange?.(null);
  }

  function addCue() {
    const previous = cues[cues.length - 1];

    const start = previous ? Number(previous.end) : 0;

    setCues((current) => [
      ...current,

      {
        id: `manual-${Date.now()}`,

        start,

        end: start + 2,

        text: "New caption",

        confidence: null,
      },
    ]);

    onBurnResultChange?.(null);
  }

  function downloadSrt() {
    downloadText(
      cuesToSrt(cues),

      `${baseName(video.filename)}.srt`,

      "application/x-subrip",
    );
  }

  function downloadVtt() {
    downloadText(
      cuesToVtt(cues),

      `${baseName(video.filename)}.vtt`,

      "text/vtt",
    );
  }

  async function handleBurn() {
    if (!video || !jobId || !cueListIsValid(cues) || isBurning) {
      return;
    }

    try {
      setIsBurning(true);

      setError("");

      onBurnResultChange?.(null);

      const response = await fetch("/api/video/subtitles", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "BURN",

          jobId,

          mediaId: video.id,

          cues,

          style,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Subtitle burn-in failed.");
      }

      onBurnResultChange?.(data.result);
    } catch (burnError) {
      setError(
        burnError instanceof Error
          ? burnError.message
          : "Subtitle burn-in failed.",
      );
    } finally {
      setIsBurning(false);
    }
  }

  if (!video) {
    return (
      <VideoToolUpload
        uploadFolder={uploadFolder}
        onVideoReady={handleVideoReady}
      />
    );
  }

  const validCues = cueListIsValid(cues);

  return (
    <div>
      <VideoSourceCard
        video={video}
        onChangeVideo={() => {
          setVideo(null);

          resetCaptions();
        }}
      />

      <div className="mt-6 rounded-2xl border border-border bg-background p-5">
        <p className="font-semibold">Transcription language</p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setLanguage(option.value);

                resetCaptions();
              }}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold ${
                language === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-muted">
          Auto Detect is recommended unless language detection is inaccurate.
        </p>
      </div>

      {cues.length === 0 && (
        <button
          type="button"
          onClick={() => handleGenerate(false)}
          disabled={isGenerating}
          className="mt-6 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isGenerating ? "Generating Subtitles..." : "Generate Auto Subtitles"}
        </button>
      )}

      {isGenerating && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message={statusMessage || "Generating subtitles..."}
          />
        </div>
      )}

      {!isGenerating && statusMessage && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
          {statusMessage}

          {jobId && cues.length === 0 && (
            <button
              type="button"
              onClick={handleCheckAgain}
              className="mt-3 min-h-11 w-full rounded-lg border border-border font-semibold text-foreground"
            >
              Check Again
            </button>
          )}
        </div>
      )}

      {cues.length > 0 && (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Review captions</p>

                <p className="mt-1 text-sm text-muted">
                  Edit text or timing before exporting or burning into the
                  video.
                </p>
              </div>

              <button
                type="button"
                onClick={addCue}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold"
              >
                <Plus size={17} />
                Add Caption
              </button>
            </div>

            <div className="mt-5 max-h-700px space-y-4 overflow-y-auto pr-1">
              {cues.map((cue, index) => (
                <div
                  key={cue.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-primary">
                      Caption {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeCue(index)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold">
                      Start (sec)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cue.start}
                        onChange={(event) =>
                          updateCue(index, "start", event.target.value)
                        }
                        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3"
                      />
                    </label>

                    <label className="text-xs font-semibold">
                      End (sec)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cue.end}
                        onChange={(event) =>
                          updateCue(index, "end", event.target.value)
                        }
                        className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block text-xs font-semibold">
                    Caption text
                    <textarea
                      rows={2}
                      maxLength={300}
                      value={cue.text}
                      onChange={(event) =>
                        updateCue(index, "text", event.target.value)
                      }
                      className="mt-2 w-full rounded-lg border border-border bg-background p-3"
                    />
                  </label>

                  {cue.confidence !== null && cue.confidence !== undefined && (
                    <p className="mt-2 text-xs text-muted">
                      Confidence: {Math.round(cue.confidence * 100)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={downloadVtt}
              disabled={!validCues}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary font-semibold text-primary disabled:opacity-40"
            >
              <Download size={17} />
              Download VTT
            </button>

            <button
              type="button"
              onClick={downloadSrt}
              disabled={!validCues}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary font-semibold text-primary disabled:opacity-40"
            >
              <Download size={17} />
              Download SRT
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-background p-5">
            <p className="font-semibold">Burn subtitles into video</p>

            <p className="mt-1 text-sm leading-6 text-muted">
              This uses the reviewed captions above, not the unedited
              transcription.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Font size
                <input
                  type="number"
                  min="18"
                  max="64"
                  value={style.fontSize}
                  onChange={(event) =>
                    setStyle((current) => ({
                      ...current,

                      fontSize: Number(event.target.value),
                    }))
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-4"
                />
              </label>

              <label className="text-sm font-semibold">
                Text color
                <input
                  type="color"
                  value={style.color}
                  onChange={(event) =>
                    setStyle((current) => ({
                      ...current,

                      color: event.target.value,
                    }))
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-border p-1"
                />
              </label>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["BOTTOM", "Bottom"],

                ["TOP", "Top"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setStyle((current) => ({
                      ...current,

                      position: value,
                    }))
                  }
                  className={`min-h-11 rounded-xl border font-semibold ${
                    style.position === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleBurn}
              disabled={!validCues || isBurning}
              className="mt-5 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isBurning ? "Burning Subtitles..." : "Burn Reviewed Subtitles"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="mt-4 min-h-11 w-full rounded-xl border border-border text-sm font-semibold"
          >
            Regenerate Transcription
          </button>
        </>
      )}

      {isBurning && (
        <div className="mt-4">
          <ProgressPanel
            status="PROCESSING"
            showProgress={false}
            message="Uploading reviewed VTT and creating the burned-in video..."
          />
        </div>
      )}

      {error && (
        <div className="mt-4">
          <ProgressPanel status="ERROR" message={error} />
        </div>
      )}
    </div>
  );
}
