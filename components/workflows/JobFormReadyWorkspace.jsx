"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {Download, ShieldCheck, Upload, XCircle} from "lucide-react";
import {runJobFormReady} from "@/lib/workflows/runJobFormReady";
import {JOB_FORM_PRESETS, JOB_FORM_READY_LIMITS, JOB_FORM_TARGETS_KB} from "@/lib/workflows/jobFormReadyPlan";

const STEPS = Object.freeze([
  {id: "IMG-10", name: "Crop and prepare form photo at chosen pixel dimensions"},
  {id: "IMG-02", name: "Compress while preserving chosen dimensions"},
]);
const fmt = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576
  ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;

export default function JobFormReadyWorkspace() {
  const [file, setFile] = useState(null);
  const [presetId, setPresetId] = useState("passport");
  const [width, setWidth] = useState("400");
  const [height, setHeight] = useState("500");
  const [zoom, setZoom] = useState(1);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [targetKb, setTargetKb] = useState(200);
  const [busy, setBusy] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [result, setResult] = useState(null);
  const [inputUrl, setInputUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [error, setError] = useState("");
  const inputUrlRef = useRef("");
  const outputUrlRef = useRef("");
  const controllerRef = useRef(null);
  const running = useRef(false);

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, []);

  function clearResult() {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = "";
    setOutputUrl("");
    setResult(null);
    setStepStatuses({});
  }
  function chooseFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected || running.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
        selected.size < 1 || selected.size > JOB_FORM_READY_LIMITS.maxInputBytes) {
      setError("Choose a non-empty JPG, PNG or WebP photo up to 10 MB.");
      return;
    }
    const url = URL.createObjectURL(selected);
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    inputUrlRef.current = url;
    setInputUrl(url);
    setFile(selected);
    clearResult();
    setError("");
  }
  function updateSetting(action) {
    if (running.current) return;
    action();
    clearResult();
    setError("");
  }
  async function handleRun(event) {
    event.preventDefault();
    if (!file || running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    clearResult();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const settings = {presetId, targetKb, zoom, verticalPosition};
      if (presetId === "custom") {
        settings.width = Number(width);
        settings.height = Number(height);
      }
      const processed = await runJobFormReady(file, settings, {
        signal: controller.signal,
        onStep: ({id, status}) => setStepStatuses((old) => ({...old, [id]: status})),
      });
      if (!controller.signal.aborted) {
        const url = URL.createObjectURL(processed.blob);
        outputUrlRef.current = url;
        setOutputUrl(url);
        setResult(processed);
      }
    } catch (err) {
      setError(controller.signal.aborted ? "Run stopped. No new photo prepared." :
        err instanceof Error ? err.message : "Could not prepare form photo locally.");
    } finally {
      controllerRef.current = null;
      running.current = false;
      setBusy(false);
    }
  }
  const chosen = JOB_FORM_PRESETS[presetId];
  const frameWidth = presetId === "custom" ? Number(width) : chosen.width;
  const frameHeight = presetId === "custom" ? Number(height) : chosen.height;
  const frameRatio = frameWidth > 0 && frameHeight > 0 && Number.isFinite(frameWidth / frameHeight)
    ? `${frameWidth} / ${frameHeight}` : "4 / 5";

  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.88fr)]">
      <form onSubmit={handleRun} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={21} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Private form-photo preparation</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              One JPG, PNG or WebP photo up to 10 MB and 20 megapixels. Runs in your browser;
              no upload, AI, face recognition or paid provider. PDF branch is preview-only.
            </p>
          </div>
        </div>
        <label htmlFor="job-form-file" className="mt-6 block text-sm font-semibold text-foreground">Choose photo</label>
        <label htmlFor="job-form-file" className={`mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-4 text-sm font-semibold text-foreground ${busy ? "pointer-events-none opacity-50" : "hover:border-primary"}`}>
          <Upload size={18} aria-hidden="true" /> {file ? "Change photo" : "Choose from device"}
        </label>
        <input id="job-form-file" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
          onChange={chooseFile} className="sr-only" />
        {file && <p className="mt-2 break-all text-xs text-muted">{file.name} • {fmt(file.size)}</p>}
        {file && inputUrl && <div className="relative mt-3 h-40 overflow-hidden rounded-xl bg-slate-50">
          <Image src={inputUrl} alt="Original selected photo" fill unoptimized
            sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
        </div>}

        <fieldset disabled={busy} className="mt-6">
          <legend className="font-semibold text-foreground">Photo dimensions (pixels)</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(JOB_FORM_PRESETS).map(([id, item]) => (
              <label key={id} className={`cursor-pointer rounded-xl border p-3 text-sm ${presetId === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
                <input type="radio" name="job-form-photo-preset" value={id} checked={presetId === id}
                  onChange={() => updateSetting(() => setPresetId(id))} className="mr-2 accent-current" />
                <span className="font-semibold">{item.label}</span>
                <span className="mt-1 block text-xs">{item.width ? `${item.width} × ${item.height}px` : "Enter your form's exact size"}</span>
              </label>
            ))}
          </div>
          {presetId === "custom" && <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="job-form-width" className="text-sm font-semibold text-foreground">Width (px)</label>
              <input id="job-form-width" type="number" min="100" max="1600" step="1" required
                value={width} onChange={(e) => updateSetting(() => setWidth(e.target.value))}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" />
            </div>
            <div>
              <label htmlFor="job-form-height" className="text-sm font-semibold text-foreground">Height (px)</label>
              <input id="job-form-height" type="number" min="100" max="1600" step="1" required
                value={height} onChange={(e) => updateSetting(() => setHeight(e.target.value))}
                className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" />
            </div>
          </div>}
        </fieldset>

        {file && inputUrl && <div className="mt-5 rounded-xl border border-border bg-background p-3">
          <p className="mb-2 text-xs font-semibold text-foreground">Approximate framing preview — export may differ</p>
          <div className="relative mx-auto max-h-64 w-full max-w-44 overflow-hidden bg-white" style={{aspectRatio: frameRatio}}>
            <Image src={inputUrl} alt="Approximate photo crop preview" fill unoptimized sizes="176px"
              className="object-cover" style={{objectPosition: `50% ${verticalPosition}%`, transform: `scale(${zoom})`}} />
          </div>
          <p className="mt-2 text-xs text-muted">Check the final JPG; this preview is not an exact passport-photo crop simulator.</p>
        </div>}

        <fieldset disabled={busy} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="job-form-zoom" className="text-sm font-semibold text-foreground">Zoom: {Math.round(zoom * 100)}%</label>
            <input id="job-form-zoom" type="range" min="1" max="2" step="0.05" value={zoom}
              onChange={(e) => updateSetting(() => setZoom(Number(e.target.value)))} className="mt-3 w-full accent-indigo-600" />
          </div>
          <div>
            <label htmlFor="job-form-position" className="text-sm font-semibold text-foreground">Vertical position: {verticalPosition}%</label>
            <input id="job-form-position" type="range" min="0" max="100" step="1" value={verticalPosition}
              onChange={(e) => updateSetting(() => setVerticalPosition(Number(e.target.value)))} className="mt-3 w-full accent-indigo-600" />
          </div>
        </fieldset>
        <fieldset disabled={busy} className="mt-5">
          <legend className="text-sm font-semibold text-foreground">Preferred maximum photo size</legend>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {JOB_FORM_TARGETS_KB.map((kb) => (
              <label key={kb} className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold ${targetKb === kb ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
                <input type="radio" name="job-form-kb" value={kb} checked={targetKb === kb}
                  onChange={() => updateSetting(() => setTargetKb(kb))} className="sr-only" />
                {kb === 1024 ? "1 MB" : `${kb} KB`}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-muted">
          Source tool crops to chosen pixels and exports JPG. The target KB is best-effort;
          if compression must change dimensions we STOP instead of claiming the photo satisfies the form.
          Verify background, head size, DPI, color, recency and other authority-specific rules yourself.
        </p>
        <button type="submit" disabled={!file || busy} className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Preparing locally..." : "Prepare Job / Form Photo"}
        </button>
        {busy && <button type="button" onClick={() => controllerRef.current?.abort()}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground">
          <XCircle size={17} aria-hidden="true" /> Stop after current step
        </button>}
      </form>

      <section className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-live="polite">
        <h2 className="text-lg font-semibold text-foreground">Workflow progress</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Fixed two-step image branch from WF-08. No file is saved until you download.</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((step, index) => {
            const status = stepStatuses[step.id] || "PENDING";
            return <li key={step.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{step.name}</p>
                <p className="mt-1 text-xs text-muted">{step.id} • {status === "SKIPPED" ? "Already within goal" : status.toLowerCase()}</p>
              </div>
            </li>;
          })}
        </ol>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {result && outputUrl ? <div className="mt-6 border-t border-border pt-5">
          <h3 className="font-semibold text-foreground">Photo prepared — verify before submitting</h3>
          <div className="relative mt-4 h-52 overflow-hidden rounded-xl bg-slate-50">
            <Image src={outputUrl} alt="Processed photo ready for review" fill unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Original</dt><dd className="font-semibold text-foreground">{fmt(result.source.bytes)}</dd></div>
            <div><dt className="text-muted">Output</dt><dd className="font-semibold text-foreground">{fmt(result.result.bytes)}</dd></div>
            <div><dt className="text-muted">Pixel dimensions</dt><dd className="font-semibold text-foreground">{result.result.width} × {result.result.height}</dd></div>
            <div><dt className="text-muted">KB goal</dt><dd className="font-semibold text-foreground">{result.result.reachedTarget ? "Reached" : "Not reached"}</dd></div>
          </dl>
          {!result.result.reachedTarget && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            The file is above your selected KB goal. It may be rejected by the form; choose a larger allowed goal or a different photo.
          </p>}
          <p className="mt-3 text-xs leading-5 text-muted">
            This tool does not verify government, passport, visa, employer or exam photo requirements.
            Confirm exact pixels, actual file bytes, crop, face visibility and accepted JPG format before submission.
          </p>
          <a href={outputUrl} download={result.filename}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={18} aria-hidden="true" /> Download {result.filename}
          </a>
        </div> : !busy && !error && <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
          The prepared JPG and download button will appear here.
        </p>}
      </section>
    </div>
  );
}
