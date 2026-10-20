"use client";

import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {Download, ShieldCheck, Upload, XCircle} from "lucide-react";
import {runWhatsAppReady} from "@/lib/workflows/runWhatsAppReady";
import {WHATSAPP_READY_LIMITS, WHATSAPP_SIZE_PRESETS} from "@/lib/workflows/whatsAppReadyPlan";

const STEPS = Object.freeze([
  {id: "IMG-05", name: "Make a compatible JPG"},
  {id: "IMG-02", name: "Reduce file size where possible"},
]);
const fmt = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576
  ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`;

export default function WhatsAppReadyWorkspace() {
  const [file, setFile] = useState(null);
  const [sizePreset, setSizePreset] = useState("balanced");
  const [busy, setBusy] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [result, setResult] = useState(null);
  const [inputUrl, setInputUrl] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const [error, setError] = useState("");
  const inputUrlRef = useRef("");
  const outputUrlRef = useRef("");
  const running = useRef(false);
  const controllerRef = useRef(null);

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
  }, []);

  function clearOutput() {
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
        selected.size < 1 || selected.size > WHATSAPP_READY_LIMITS.maxInputBytes) {
      setError("Select a non-empty JPG, PNG or WebP photo up to 10 MB.");
      return;
    }
    const url = URL.createObjectURL(selected);
    if (inputUrlRef.current) URL.revokeObjectURL(inputUrlRef.current);
    inputUrlRef.current = url;
    setInputUrl(url);
    setFile(selected);
    clearOutput();
    setStatuses({});
    setError("");
  }

  async function handleRun(event) {
    event.preventDefault();
    if (running.current || !file) return;
    running.current = true;
    setBusy(true);
    setError("");
    clearOutput();
    setStatuses({});
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const processed = await runWhatsAppReady(file, {sizePreset}, {
        signal: controller.signal,
        onStep: ({id, status}) => setStatuses((old) => ({...old, [id]: status})),
      });
      if (!controller.signal.aborted) {
        const url = URL.createObjectURL(processed.blob);
        outputUrlRef.current = url;
        setOutputUrl(url);
        setResult(processed);
      }
    } catch (err) {
      setError(controller.signal.aborted ? "Run stopped. No file was saved." :
        err instanceof Error ? err.message : "This photo could not be processed locally.");
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
            <p className="font-semibold text-foreground">Private photo processing</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              One photo at a time, entirely in your browser. No upload, AI service or credit use.
              JPG, PNG and WebP supported up to 10 MB and 20 megapixels.
            </p>
          </div>
        </div>

        <label htmlFor="whatsapp-photo" className="mt-6 block text-sm font-semibold text-foreground">Choose your photo</label>
        <div className="mt-2 rounded-xl border border-dashed border-border bg-background p-4">
          <label htmlFor="whatsapp-photo" className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground ${busy ? "pointer-events-none opacity-50" : "hover:border-primary"}`}>
            <Upload size={18} aria-hidden="true" /> {file ? "Change photo" : "Choose from device"}
          </label>
          <input id="whatsapp-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={chooseFile} className="sr-only" />
          {file && <p className="mt-3 break-all text-xs text-muted" aria-live="polite">{file.name} • {fmt(file.size)}</p>}
          {file && inputUrl && <div className="relative mt-3 h-44 overflow-hidden rounded-lg bg-slate-50">
            <Image src={inputUrl} alt="Original photo" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>}
        </div>

        <fieldset disabled={busy} className="mt-6">
          <legend className="text-sm font-semibold text-foreground">Which matters more?</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {Object.entries(WHATSAPP_SIZE_PRESETS).map(([id, preset]) => (
              <label key={id} className={`cursor-pointer rounded-xl border p-3 text-sm transition ${sizePreset === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground"}`}>
                <input type="radio" name="whatsapp-size" value={id} checked={sizePreset === id}
                  onChange={() => {setSizePreset(id); clearOutput(); setStatuses({}); setError("");}} className="mr-2 accent-current" />
                <span className="font-semibold">{preset.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">The selected size is a goal, not a guarantee. The actual output size is always shown. Large photos may be resized automatically.</p>
        </fieldset>
        <p className="mt-4 text-xs leading-5 text-muted">PNG transparency is replaced with white for JPG compatibility. Videos are not supported in this local beta.</p>
        <button type="submit" disabled={!file || busy} className="mt-5 min-h-12 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? "Preparing photo..." : "Make WhatsApp Ready"}
        </button>
        {busy && <button type="button" onClick={() => controllerRef.current?.abort()}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground">
          <XCircle size={17} aria-hidden="true" /> Stop after current step
        </button>}
      </form>

      <section className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-live="polite">
        <h2 className="text-lg font-semibold text-foreground">Your preparation steps</h2>
        <p className="mt-2 text-sm leading-6 text-muted">See the two approved steps before running. The output of the first is used in the second.</p>
        <ol className="mt-5 space-y-3">
          {STEPS.map((step, index) => {
            const status = statuses[step.id] || "PENDING";
            return <li key={step.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{step.name}</p>
                <p className="mt-1 text-xs text-muted">{step.id} • {status === "SKIPPED" ? "Not needed" : status.toLowerCase()}</p></div>
            </li>;
          })}
        </ol>
        {error && <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
        {result && outputUrl ? <div className="mt-6 border-t border-border pt-5">
          <h3 className="font-semibold text-foreground">Your photo is ready</h3>
          <div className="relative mt-4 h-48 overflow-hidden rounded-xl bg-slate-50">
            <Image src={outputUrl} alt="WhatsApp-ready JPG photo" fill unoptimized sizes="(max-width: 1024px) 100vw, 50vw" className="object-contain p-2" />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted">Original</dt><dd className="font-semibold text-foreground">{fmt(result.source.bytes)}</dd></div>
            <div><dt className="text-muted">Prepared JPG</dt><dd className="font-semibold text-foreground">{fmt(result.result.bytes)}</dd></div>
            <div><dt className="text-muted">Output pixels</dt><dd className="font-semibold text-foreground">{result.result.width} × {result.result.height}</dd></div>
            <div><dt className="text-muted">Size goal</dt><dd className="font-semibold text-foreground">{result.result.reachedTarget ? "Reached" : "Not reached"}</dd></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted">
            {result.result.bytes < result.source.bytes ? `Saved ${Math.round((1 - result.result.bytes / result.source.bytes) * 100)}% of original size.` :
              "Conversion did not reduce this photo's size. You can compare and choose the original instead."}
            {!result.result.reachedTarget ? " This photo could not reach the size goal at the available quality settings." : ""}
          </p>
          <a href={outputUrl} download={result.filename}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={18} aria-hidden="true" /> Download prepared JPG
          </a>
          </div> : !busy && !error && <p className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">Your processed photo and download button will appear here.</p>}
      </section>
    </div>
  );
}
