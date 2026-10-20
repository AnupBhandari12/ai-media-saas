"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {Download, ShieldCheck, Upload, XCircle} from "lucide-react";
import {runLinkedInReady} from "@/lib/workflows/runLinkedInReady";
import {LINKEDIN_PRESETS, LINKEDIN_LIMITS} from "@/lib/workflows/linkedInReadyPlan";

const STEPS = Object.freeze([
  {id: "IMG-03", label: "Resize within chosen pixel limits"},
  {id: "IMG-05", label: "Convert image to JPG if needed"},
  {id: "IMG-01", label: "Compress locally (best effort)"},
]);
const bytesLabel = (size) => size < 1024 ? `${size} B` : size < 1048576
  ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(2)} MB`;

export default function LinkedInReadyWorkspace() {
  const [file, setFile] = useState(null);
  const [presetId, setPresetId] = useState("landscape");
  const [qualityPercent, setQualityPercent] = useState(80);
  const [inputUrl, setInputUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState({});
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
    setSteps({});
  }
  function chooseFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected || running.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
        selected.size < 1 || selected.size > LINKEDIN_LIMITS.maxInputBytes) {
      setError("Choose a non-empty JPG, PNG or WebP image up to 10 MB.");
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
  function settingChanged(fn) {
    if (running.current) return;
    fn();
    clearResult();
    setError("");
  }
  async function process(event) {
    event.preventDefault();
    if (!file || running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    clearResult();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const completed = await runLinkedInReady(file, {presetId, qualityPercent}, {
        signal: controller.signal,
        onStep: ({id, status}) => setSteps((old) => ({...old, [id]: status})),
      });
      if (!controller.signal.aborted) {
        const url = URL.createObjectURL(completed.blob);
        outputRef.current = url;
        setOutputUrl(url);
        setResult(completed);
      }
    } catch (err) {
      setError(controller.signal.aborted ? "Run stopped; no new image prepared." :
        err instanceof Error ? err.message : "Unable to process this image locally.");
    } finally {
      controllerRef.current = null;
      running.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.86fr)]">
      <form onSubmit={process} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={21} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">LinkedIn post image • browser-only beta</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Approved post-photo path only. Nothing is uploaded or posted to LinkedIn.
              No profile processing, account integration, video, paid provider or AI credits.
            </p>
          </div>
        </div>

        <label htmlFor="linkedin-file" className="mt-6 block text-sm font-semibold text-foreground">Image</label>
        <label htmlFor="linkedin-file" className={`mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-4 text-sm font-semibold text-foreground ${busy ? "pointer-events-none opacity-50" : "hover:border-primary"}`}>
          <Upload size={18} aria-hidden="true" /> {file ? "Choose another image" : "Choose JPG, PNG or WebP"}
        </label>
        <input id="linkedin-file" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
          disabled={busy} onChange={chooseFile} />
        {file && <p className="mt-2 break-all text-xs text-muted">{file.name} • {bytesLabel(file.size)}</p>}
        {inputUrl && <div className="relative mt-3 h-44 overflow-hidden rounded-xl bg-slate-50">
          <Image src={inputUrl} alt="Original image" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
        </div>}

        <fieldset disabled={busy} className="mt-6">
          <legend className="font-semibold text-foreground">Output dimension bounds</legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {Object.entries(LINKEDIN_PRESETS).map(([id, option]) => (
              <label key={id} className={`cursor-pointer rounded-xl border p-3 text-sm ${presetId === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
                <input type="radio" name="linkedin-preset" className="mr-2 accent-current" checked={presetId === id}
                  onChange={() => settingChanged(() => setPresetId(id))} />
                <span className="font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs">Max {option.maxWidth} × {option.maxHeight}px</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={busy} className="mt-5">
          <legend className="text-sm font-semibold text-foreground">JPG compression quality (best effort)</legend>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[70, 80, 90].map((value) => <label key={value}
              className={`cursor-pointer rounded-xl border p-3 text-center text-sm font-semibold ${qualityPercent === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
              <input type="radio" name="linkedin-quality" className="sr-only" checked={qualityPercent === value}
                onChange={() => settingChanged(() => setQualityPercent(value))} /> {value}%
            </label>)}
          </div>
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-muted">
          Output keeps the original aspect ratio: a square preset does not crop a landscape photo into a square.
          Smaller photos are not upscaled, and LinkedIn may display its own crop. Transparent PNG backgrounds turn white when converted to JPG.
        </p>
        <button type="submit" disabled={!file || busy}
          className="mt-5 min-h-12 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Preparing post image..." : "Prepare LinkedIn Post Image"}
        </button>
        {busy && <button type="button" onClick={() => controllerRef.current?.abort()}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground">
          <XCircle size={17} aria-hidden="true" /> Stop after current step
        </button>}
      </form>

      <section aria-live="polite" className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground">Workflow progress</h2>
        <p className="mt-2 text-sm leading-6 text-muted">WF-04 post variant uses three approved browser image tools in order.</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((item, i) => {
            const status = steps[item.id] || "PENDING";
            return <li key={item.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-muted">{item.id} • {status === "SKIPPED" ? "Already suitable / unchanged" : status.toLowerCase()}</p>
              </div>
            </li>;
          })}
        </ol>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {result && outputUrl ? <div className="mt-6 border-t border-border pt-5">
          <h3 className="font-semibold text-foreground">Processed image — review before posting</h3>
          <div className="relative mt-4 h-64 overflow-hidden rounded-xl bg-slate-50">
            <Image src={outputUrl} alt="Prepared LinkedIn post image" fill unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Original</dt><dd className="font-semibold text-foreground">{bytesLabel(result.source.bytes)}</dd></div>
            <div><dt className="text-muted">Output</dt><dd className="font-semibold text-foreground">{bytesLabel(result.result.bytes)}</dd></div>
            <div><dt className="text-muted">Pixels</dt><dd className="font-semibold text-foreground">{result.result.width} × {result.result.height}</dd></div>
            <div><dt className="text-muted">Format</dt><dd className="font-semibold text-foreground">JPG</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted">No crop or upscale was performed.
            These presets are not a guarantee of LinkedIn publishing acceptance.</p>
          <a href={outputUrl} download={result.filename}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={18} aria-hidden="true" /> Download {result.filename}
          </a>
        </div> : !busy && !error && <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
          Processed image and download will appear here.
        </p>}
      </section>
    </div>
  );
}
