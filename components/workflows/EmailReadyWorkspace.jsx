"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {Download, ShieldCheck, Upload, XCircle} from "lucide-react";
import {runEmailReady} from "@/lib/workflows/runEmailReady";
import {EMAIL_READY_LIMITS, EMAIL_SIZE_PRESETS} from "@/lib/workflows/emailReadyPlan";

const STEP = Object.freeze({id: "IMG-02", name: "Compress the image attachment to a practical size"});
const fmt = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576
  ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;
const mimeName = (mime) => ({"image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP"}[mime] || "Image");

export default function EmailReadyWorkspace() {
  const [file, setFile] = useState(null);
  const [sizePreset, setSizePreset] = useState("balanced");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("PENDING");
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
  }

  function chooseFile(event) {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected || running.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
        selected.size < 1 || selected.size > EMAIL_READY_LIMITS.maxInputBytes) {
      setError("Choose a non-empty JPG, PNG or WebP image up to 10 MB.");
      return;
    }
    const url = URL.createObjectURL(selected);
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    inputUrlRef.current = url;
    setInputUrl(url);
    setFile(selected);
    clearResult();
    setStatus("PENDING");
    setError("");
  }

  async function handleRun(event) {
    event.preventDefault();
    if (running.current || !file) return;
    running.current = true;
    setBusy(true);
    clearResult();
    setStatus("PENDING");
    setError("");
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const prepared = await runEmailReady(file, {sizePreset}, {
        signal: controller.signal, onStep: ({status: next}) => setStatus(next),
      });
      if (!controller.signal.aborted) {
        const url = URL.createObjectURL(prepared.blob);
        outputUrlRef.current = url;
        setOutputUrl(url);
        setResult(prepared);
      }
    } catch (err) {
      setError(controller.signal.aborted ? "Run stopped. No new file was prepared." :
        err instanceof Error ? err.message : "This image could not be prepared locally.");
    } finally {
      running.current = false;
      controllerRef.current = null;
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(310px,0.87fr)]">
      <form onSubmit={handleRun} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={21} aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Private image attachment preparation</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              One JPG, PNG or WebP image at a time, up to 10 MB and 20 megapixels. No upload,
              paid AI or server processing. PDF attachments remain preview-only.
            </p>
          </div>
        </div>

        <label htmlFor="email-ready-image" className="mt-6 block text-sm font-semibold text-foreground">Choose image attachment</label>
        <div className="mt-2 rounded-xl border border-dashed border-border bg-background p-4">
          <label htmlFor="email-ready-image" className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground ${busy ? "pointer-events-none opacity-50" : "hover:border-primary"}`}>
            <Upload size={18} aria-hidden="true" /> {file ? "Change image" : "Choose from device"}
          </label>
          <input id="email-ready-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={chooseFile} className="sr-only" />
          {file && <p className="mt-3 break-all text-xs text-muted" aria-live="polite">{file.name} • {fmt(file.size)}</p>}
          {file && inputUrl && <div className="relative mt-3 h-44 overflow-hidden rounded-lg bg-slate-50">
            <Image src={inputUrl} alt="Original image attachment" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>}
        </div>

        <fieldset disabled={busy} className="mt-6">
          <legend className="text-sm font-semibold text-foreground">Preferred attachment size</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {Object.entries(EMAIL_SIZE_PRESETS).map(([id, preset]) => (
              <label key={id} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${sizePreset === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
                <input type="radio" name="email-size" value={id} checked={sizePreset === id}
                  onChange={() => {setSizePreset(id); clearResult(); setStatus("PENDING"); setError("");}} className="mr-2 accent-current" />
                <span className="font-semibold">{preset.label}</span>
                <span className="mt-1 block text-xs">{preset.targetKb} KB goal</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-4 text-xs leading-5 text-muted">
          The KB goal is best-effort, not a guaranteed email-provider limit. Existing IMG-02
          can change PNG to WebP when compression is needed and may resize large photos.
          WebP is not supported by all email recipients; choose the downloaded format accordingly.
        </p>
        <button type="submit" disabled={!file || busy} className="mt-5 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Preparing attachment..." : "Prepare Email Attachment"}
        </button>
        {busy && <button type="button" onClick={() => controllerRef.current?.abort()} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground">
          <XCircle size={17} aria-hidden="true" /> Stop after current step
        </button>}
      </form>

      <section className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-live="polite">
        <h2 className="text-lg font-semibold text-foreground">Approved processing step</h2>
        <p className="mt-2 text-sm leading-6 text-muted">One registry-approved tool. No unapproved transformations, PDF backend or paid operations.</p>
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-background p-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{STEP.name}</p>
            <p className="mt-1 text-xs text-muted">{STEP.id} • {status === "SKIPPED" ? "Already meets size goal" : status.toLowerCase()}</p>
          </div>
        </div>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
        {result && outputUrl ? <div className="mt-6 border-t border-border pt-5">
          <h3 className="font-semibold text-foreground">Image attachment ready</h3>
          <div className="relative mt-4 h-48 overflow-hidden rounded-xl bg-slate-50">
            <Image src={outputUrl} alt="Email-ready image attachment" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Original</dt><dd className="font-semibold text-foreground">{fmt(result.source.bytes)}</dd></div>
            <div><dt className="text-muted">Prepared</dt><dd className="font-semibold text-foreground">{fmt(result.result.bytes)}</dd></div>
            <div><dt className="text-muted">Output format</dt><dd className="font-semibold text-foreground">{mimeName(result.result.mimeType)}</dd></div>
            <div><dt className="text-muted">Output pixels</dt><dd className="font-semibold text-foreground">{result.result.width} × {result.result.height}</dd></div>
            <div><dt className="text-muted">Size goal</dt><dd className="font-semibold text-foreground">{result.result.reachedTarget ? "Reached" : "Not reached"}</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted">
            {result.result.bytes < result.source.bytes ? `Saved ${Math.round((1 - result.result.bytes / result.source.bytes) * 100)}% of source bytes.` :
              "No byte-size saving this time; you may prefer the original."}
            {!result.result.reachedTarget ? " The compression engine did not reach the selected target." : ""}
            {result.source.mimeType === "image/png" && result.result.mimeType === "image/webp" ?
              " PNG was converted to WebP by the existing compressor; check recipient compatibility." : ""}
          </p>
          <a href={outputUrl} download={result.filename} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={18} aria-hidden="true" /> Download {result.filename}
          </a>
        </div> : !busy && !error && <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Your prepared attachment will appear here after the local processing step.</p>}
      </section>
    </div>
  );
}
