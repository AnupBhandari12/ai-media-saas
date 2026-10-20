"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Download, ShieldCheck, Upload, XCircle } from "lucide-react";
import { runWebsiteReady } from "@/lib/workflows/runWebsiteReady";
import { WEBSITE_READY_LIMITS } from "@/lib/workflows/websiteReadyPlan";

const STEPS = [
  {id: "IMG-03", name: "Fit maximum image dimension"},
  {id: "IMG-05", name: "Convert format"},
  {id: "IMG-14", name: "Strip common image metadata"},
  {id: "IMG-02", name: "Compress to target size"},
];

const fmt = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576
  ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;

export default function WebsiteReadyWorkspace() {
  const [file, setFile] = useState(null);
  const [longSide, setLongSide] = useState("1600");
  const [targetKb, setTargetKb] = useState("400");
  const [outputMimeType, setOutputMimeType] = useState("image/webp");
  const [busy, setBusy] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [result, setResult] = useState(null);
  const [inputUrl, setInputUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const inputUrlRef = useRef("");
  const outputUrlRef = useRef("");
  const [error, setError] = useState("");
  const running = useRef(false);
  const runAbort = useRef(null);
  useEffect(() => () => {
    runAbort.current?.abort();
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, []);

  function clearOutput() {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = "";
    setOutputUrl("");
    setResult(null);
  }

  function handleFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) || selected.size < 1 || selected.size > WEBSITE_READY_LIMITS.maxInputBytes) {
      setError("Choose a non-empty JPG, PNG or WebP image up to 10 MB.");
      return;
    }
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    const url = URL.createObjectURL(selected);
    inputUrlRef.current = url;
    setInputUrl(url);
    setFile(selected);
    clearOutput();
    setStepStatuses({});
    setError("");
  }

  async function handleRun(event) {
    event.preventDefault();
    if (running.current || !file) return;
    running.current = true;
    setBusy(true);
    setError("");
    clearOutput();
    setStepStatuses({});
    const controller = new AbortController();
    runAbort.current = controller;
    try {
      const processed = await runWebsiteReady(file, {
        longSide: Number(longSide), targetKb: Number(targetKb), outputMimeType,
      }, {
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
      setError(controller.signal.aborted ? "Run stopped. No file was saved." :
        err instanceof Error ? err.message : "This image could not be processed locally.");
    } finally {
      running.current = false;
      setBusy(false);
      runAbort.current = null;
    }
  }

  function resetResult() { clearOutput(); setStepStatuses({}); setError(""); }

  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.87fr)]">
      <form onSubmit={handleRun} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={21} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Private, local processing</p>
            <p className="mt-1 text-sm leading-6 text-muted">One image at a time. No upload, AI call, Cloudinary or credit consumption. Supports JPG, PNG and WebP up to 10 MB and 20 megapixels.</p>
          </div>
        </div>

        <label htmlFor="website-ready-file" className="mt-6 block text-sm font-semibold text-foreground">Choose an image</label>
        <div className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-border bg-background p-4">
          <label htmlFor="website-ready-file" className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground ${busy ? "pointer-events-none opacity-50" : "hover:border-primary"}`}>
            <Upload size={18} aria-hidden="true" /> {file ? "Change image" : "Select from device"}
          </label>
          <input id="website-ready-file" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={handleFile} className="sr-only" />
          {file && <p className="break-all text-xs text-muted" aria-live="polite">{file.name} • {fmt(file.size)}</p>}
          {file && inputUrl && (
            <div className="relative h-44 overflow-hidden rounded-lg bg-slate-50">
              <Image src={inputUrl} alt="Original selected image" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="website-long-side" className="text-sm font-semibold text-foreground">Max dimension (px)</label>
            <input id="website-long-side" type="number" min="320" max="2400" step="1" required disabled={busy} value={longSide} onChange={(e) => {setLongSide(e.target.value); resetResult();}} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" />
          </div>
          <div>
            <label htmlFor="website-target-kb" className="text-sm font-semibold text-foreground">Target size (KB)</label>
            <input id="website-target-kb" type="number" min="30" max="2048" step="1" required disabled={busy} value={targetKb} onChange={(e) => {setTargetKb(e.target.value); resetResult();}} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground" />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="website-format" className="text-sm font-semibold text-foreground">Output format</label>
          <select id="website-format" value={outputMimeType} disabled={busy} onChange={(e) => {setOutputMimeType(e.target.value); resetResult();}} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-foreground">
            <option value="image/webp">WebP (recommended)</option>
            <option value="image/jpeg">JPG (white background for transparency)</option>
          </select>
        </div>

        <p className="mt-4 text-xs leading-5 text-muted">Maximum dimension preserves aspect ratio and does not enlarge small images. Target compression may reduce dimensions further. The final target is not guaranteed; actual output is reported.</p>
        <button type="submit" disabled={!file || busy} className="mt-5 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Processing locally..." : "Make Website Ready"}
        </button>
        {busy && (
          <button type="button" onClick={() => runAbort.current?.abort()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground">
            <XCircle size={17} aria-hidden="true" /> Stop after current step
          </button>
        )}
      </form>

      <section className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-live="polite">
        <h2 className="text-lg font-semibold text-foreground">Processing steps</h2>
        <p className="mt-2 text-sm leading-6 text-muted">Each step uses an existing AI Media image tool. The output of one becomes the input of the next.</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((step, i) => {
            const status = stepStatuses[step.id] || "PENDING";
            return <li key={step.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{step.name}</p>
                <p className="mt-1 text-xs text-muted">{step.id} • {status === "SKIPPED" ? "Not needed" : status.toLowerCase()}</p>
              </div>
            </li>;
          })}
        </ol>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
        {result && outputUrl ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="font-semibold text-foreground">Your web image is ready</h3>
            <div className="relative mt-4 h-48 overflow-hidden rounded-xl bg-slate-50">
              <Image src={outputUrl} alt="Processed website-ready image" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted">Original</dt><dd className="font-semibold text-foreground">{fmt(result.source.bytes)}</dd></div>
              <div><dt className="text-muted">Output</dt><dd className="font-semibold text-foreground">{fmt(result.result.bytes)}</dd></div>
              <div><dt className="text-muted">Dimensions</dt><dd className="font-semibold text-foreground">{result.result.width} × {result.result.height}</dd></div>
              <div><dt className="text-muted">Size target</dt><dd className="font-semibold text-foreground">{result.result.targetReached ? "Reached" : "Not reached"}</dd></div>
            </dl>
            {!result.result.targetReached && <p className="mt-3 text-sm text-amber-700">The output is the closest result within the existing compression engine limits, not a guarantee of target KB.</p>}
            <a href={outputUrl} download={result.filename} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
              <Download size={17} aria-hidden="true" /> Download {result.filename}
            </a>
          </div>
        ) : !busy && !error && <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Your processed image and download button will appear here.</p>}
      </section>
    </div>
  );
}
