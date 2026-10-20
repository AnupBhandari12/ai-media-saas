"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {Download, ShieldCheck, Upload, XCircle} from "lucide-react";
import {runInstagramReady} from "@/lib/workflows/runInstagramReady";
import {INSTAGRAM_PRESETS, INSTAGRAM_READY_LIMITS} from "@/lib/workflows/instagramReadyPlan";

const STEPS = Object.freeze([
  {id: "IMG-08", label: "Crop photo to the chosen aspect ratio"},
  {id: "IMG-03", label: "Resize to the selected output pixels"},
  {id: "IMG-01", label: "Try local image compression"},
]);
const bytesLabel = (size) => size < 1024 ? `${size} B` : size < 1048576
  ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(2)} MB`;

export default function InstagramReadyWorkspace() {
  const [file, setFile] = useState(null);
  const [presetId, setPresetId] = useState("portrait");
  const [horizontalPosition, setHorizontalPosition] = useState(50);
  const [verticalPosition, setVerticalPosition] = useState(50);
  const [qualityPercent, setQualityPercent] = useState(80);
  const [inputUrl, setInputUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef("");
  const outputRef = useRef("");
  const controllerRef = useRef(null);
  const running = useRef(false);

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (inputRef.current) URL.revokeObjectURL(inputRef.current);
    if (outputRef.current) URL.revokeObjectURL(outputRef.current);
  }, []);

  function clearResult() {
    if (outputRef.current) URL.revokeObjectURL(outputRef.current);
    outputRef.current = "";
    setOutputUrl("");
    setResult(null);
    setStepStatuses({});
  }
  function chooseFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected || running.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
        selected.size < 1 || selected.size > INSTAGRAM_READY_LIMITS.maxFileBytes) {
      setError("Choose a non-empty JPG, PNG or WebP photo up to 10 MB.");
      return;
    }
    const url = URL.createObjectURL(selected);
    if (inputRef.current) URL.revokeObjectURL(inputRef.current);
    inputRef.current = url;
    setInputUrl(url);
    setFile(selected);
    clearResult();
    setError("");
  }
  function updateSetting(callback) {
    if (running.current) return;
    callback();
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
      const completed = await runInstagramReady(file,
        {presetId, horizontalPosition, verticalPosition, qualityPercent}, {
          signal: controller.signal,
          onStep: ({id, status}) => setStepStatuses((old) => ({...old, [id]: status})),
        });
      if (!controller.signal.aborted) {
        const url = URL.createObjectURL(completed.blob);
        outputRef.current = url;
        setOutputUrl(url);
        setResult(completed);
      }
    } catch (err) {
      setError(controller.signal.aborted ? "Run stopped. No new photo prepared." :
        err instanceof Error ? err.message : "Could not process this photo locally.");
    } finally {
      controllerRef.current = null;
      running.current = false;
      setBusy(false);
    }
  }
  const chosen = INSTAGRAM_PRESETS[presetId];
  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.86fr)]">
      <form onSubmit={handleRun} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={21} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Instagram image beta • browser only</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Prepare one post or story photo using existing tools. Nothing is uploaded or published.
              No AI credits or paid provider. Reel and video processing remain preview-only.
            </p>
          </div>
        </div>

        <label htmlFor="instagram-file" className="mt-6 block text-sm font-semibold text-foreground">Photo</label>
        <label htmlFor="instagram-file" className={`mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-4 text-sm font-semibold text-foreground ${busy ? "pointer-events-none opacity-50" : "hover:border-primary"}`}>
          <Upload size={18} aria-hidden="true" /> {file ? "Choose another photo" : "Choose JPG, PNG or WebP"}
        </label>
        <input id="instagram-file" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp"
          disabled={busy} onChange={chooseFile} />
        {file && <p className="mt-2 break-all text-xs text-muted">{file.name} • {bytesLabel(file.size)}</p>}
        {file && inputUrl && <div className="relative mt-3 h-44 overflow-hidden rounded-xl bg-slate-50">
          <Image src={inputUrl} alt="Original selected Instagram photo" fill unoptimized
            sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
        </div>}

        <fieldset disabled={busy} className="mt-6">
          <legend className="font-semibold text-foreground">Target layout</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {Object.entries(INSTAGRAM_PRESETS).map(([id, option]) => (
              <label key={id} className={`cursor-pointer rounded-xl border p-3 text-sm ${presetId === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
                <input type="radio" name="instagram-preset" className="mr-2 accent-current" checked={presetId === id}
                  onChange={() => updateSetting(() => setPresetId(id))} />
                <span className="font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs">{option.width} × {option.height}px</span>
              </label>
            ))}
          </div>
        </fieldset>

        {file && inputUrl && <div className="mt-5 rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold text-foreground">Approximate crop framing</p>
          <div className="relative mx-auto mt-3 max-h-72 w-full max-w-48 overflow-hidden rounded-lg bg-slate-100"
            style={{aspectRatio: `${chosen.width} / ${chosen.height}`}}>
            <Image src={inputUrl} alt="Approximate center crop preview" fill unoptimized sizes="192px"
              className="object-cover" style={{objectPosition: `${horizontalPosition}% ${verticalPosition}%`}} />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            The preview is approximate. Cropping can remove the sides or top and bottom.
            Always inspect the final output before posting.
          </p>
        </div>}

        <fieldset disabled={busy} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="instagram-horizontal" className="text-sm font-semibold text-foreground">Horizontal focus: {horizontalPosition}%</label>
            <input id="instagram-horizontal" type="range" min="0" max="100" step="1" value={horizontalPosition}
              onChange={(e) => updateSetting(() => setHorizontalPosition(Number(e.target.value)))}
              className="mt-3 w-full accent-indigo-600" />
          </div>
          <div>
            <label htmlFor="instagram-vertical" className="text-sm font-semibold text-foreground">Vertical focus: {verticalPosition}%</label>
            <input id="instagram-vertical" type="range" min="0" max="100" step="1" value={verticalPosition}
              onChange={(e) => updateSetting(() => setVerticalPosition(Number(e.target.value)))}
              className="mt-3 w-full accent-indigo-600" />
          </div>
        </fieldset>
        <fieldset disabled={busy} className="mt-5">
          <legend className="text-sm font-semibold text-foreground">Compression quality (best effort)</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[70, 80, 90].map((value) => <label key={value}
              className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold ${qualityPercent === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
              <input type="radio" name="instagram-quality" className="sr-only" checked={qualityPercent === value}
                onChange={() => updateSetting(() => setQualityPercent(value))} /> {value}%
            </label>)}
          </div>
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-muted">
          The original photo must be large enough for the chosen output without upscaling.
          PNG compression may not reduce bytes. Social platform limits and display crops can change.
        </p>
        <button type="submit" disabled={!file || busy}
          className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Preparing photo..." : "Prepare Instagram Image"}
        </button>
        {busy && <button type="button" onClick={() => controllerRef.current?.abort()}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground">
          <XCircle size={17} aria-hidden="true" /> Stop after current step
        </button>}
      </form>

      <section aria-live="polite" className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Workflow progress</h2>
        <p className="mt-2 text-sm leading-6 text-muted">WF-02 photo branch runs 3 approved local tools in order.</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((step, index) => {
            const status = stepStatuses[step.id] || "PENDING";
            return <li key={step.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="mt-1 text-xs text-muted">{step.id} • {status === "SKIPPED" ? "Unchanged / already smaller" : status.toLowerCase()}</p>
              </div>
            </li>;
          })}
        </ol>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {result && outputUrl ? <div className="mt-6 border-t border-border pt-5">
          <h3 className="font-semibold text-foreground">Processed image — review before sharing</h3>
          <div className="relative mt-4 h-64 overflow-hidden rounded-xl bg-slate-50">
            <Image src={outputUrl} alt="Processed Instagram photo" fill unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Original</dt><dd className="font-semibold text-foreground">{bytesLabel(result.source.bytes)}</dd></div>
            <div><dt className="text-muted">Output</dt><dd className="font-semibold text-foreground">{bytesLabel(result.result.bytes)}</dd></div>
            <div><dt className="text-muted">Pixel dimensions</dt><dd className="font-semibold text-foreground">{result.result.width} × {result.result.height}</dd></div>
            <div><dt className="text-muted">Format</dt><dd className="font-semibold text-foreground">{result.result.mimeType}</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted">
            This is a locally prepared file, not proof of acceptance by Instagram.
            Confirm the final crop before publishing. No automatic posting occurs.
          </p>
          <a href={outputUrl} download={result.filename}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={18} aria-hidden="true" /> Download {result.filename}
          </a>
        </div> : !busy && !error && <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
          Your processed image and download button will appear here.
        </p>}
      </section>
    </div>
  );
}
