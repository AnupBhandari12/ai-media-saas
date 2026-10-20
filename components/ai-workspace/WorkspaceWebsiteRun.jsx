"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Play, ShieldCheck, Upload, XCircle } from "lucide-react";
import { createWorkspaceLocalRunOffer, runWorkspaceWebsiteReady } from "@/lib/ai-workspace/localExecutionBridge";

const prettyBytes = (n) => n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;

export default function WorkspaceWebsiteRun({ plan }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [result, setResult] = useState(null);
  const [stepStatus, setStepStatus] = useState({});
  const urlRef = useRef("");
  const controllerRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => () => {
    controllerRef.current?.abort();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  let offer;
  try {
    offer = createWorkspaceLocalRunOffer(plan, true);
    if (offer.kind !== "BROWSER_LOCAL_WEBSITE_READY") throw new Error("Unavailable workflow.");
  } catch {
    return <p role="alert" className="text-sm text-red-600">This local run is unavailable. Preview and review the plan again.</p>;
  }

  function clearResult() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = "";
    setDownloadUrl("");
    setResult(null);
    setStepStatus({});
  }

  function chooseFile(event) {
    if (runningRef.current) return;
    const next = event.target.files?.[0];
    event.target.value = "";
    clearResult();
    setFile(null);
    setError("");
    if (!next) return;
    if (!offer.acceptedTypes.includes(next.type) || next.size < 1 || next.size > offer.maxInputBytes) {
      setError("Choose a non-empty JPG, PNG or WebP file up to 10 MB.");
      return;
    }
    setFile(next);
  }

  async function runLocal() {
    if (runningRef.current || !file) return;
    runningRef.current = true;
    setBusy(true);
    setError("");
    clearResult();
    const abort = new AbortController();
    controllerRef.current = abort;
    try {
      const output = await runWorkspaceWebsiteReady(plan, true, file, {
        signal: abort.signal,
        onStep: (step) => {
          if (!abort.signal.aborted) setStepStatus((old) => ({ ...old, [step.id]: step.status }));
        },
      });
      if (abort.signal.aborted) return;
      const url = URL.createObjectURL(output.blob);
      urlRef.current = url;
      setDownloadUrl(url);
      setResult(output);
    } catch (caught) {
      if (!abort.signal.aborted) {
        setError(caught instanceof Error ? caught.message : "Local processing failed.");
      }
    } finally {
      controllerRef.current = null;
      runningRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-label="Run Website Ready locally" className="mt-5 space-y-4 rounded-xl border border-border bg-background p-4">
      <div className="flex items-start gap-2">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-foreground">Run Website Ready here · local beta</h4>
          <p className="mt-1 text-xs leading-5 text-muted">Your selected photo stays in this browser. It is not uploaded or sent to AI. Click Run yourself after reviewing the defaults.</p>
        </div>
      </div>
      <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
        <p>Max dimension: <strong className="text-foreground">{offer.settings.longSide}px</strong></p>
        <p>Target size: <strong className="text-foreground">{offer.settings.targetKb} KB</strong></p>
        <p>Output: <strong className="text-foreground">WebP</strong></p>
      </div>
      <label htmlFor="ai-workspace-local-file" className="block text-sm font-semibold text-foreground">Choose one photo (up to 10 MB)</label>
      <input id="ai-workspace-local-file" type="file" accept="image/jpeg,image/png,image/webp"
        onChange={chooseFile} disabled={busy}
        className="block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:font-semibold file:text-primary" />
      {file && <p className="break-all text-xs text-muted">{file.name} · {prettyBytes(file.size)}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={runLocal} disabled={!file || busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary-hover">
          {busy ? <Upload size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          {busy ? "Processing locally…" : "Run locally"}
        </button>
        <button type="button" onClick={() => controllerRef.current?.abort()} disabled={!busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-foreground disabled:opacity-50">
          <XCircle size={17} aria-hidden="true" /> Cancel
        </button>
      </div>
      {Object.keys(stepStatus).length > 0 && (
        <ol className="space-y-1 text-xs text-muted" aria-label="Local step status">
          {offer.steps.map((id) => <li key={id}>{id}: {stepStatus[id] || "PENDING"}</li>)}
        </ol>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {result && downloadUrl && (
        <div role="status" className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-semibold text-foreground">Local processing complete · {prettyBytes(result.blob.size)}</p>
          <a href={downloadUrl} download={result.filename}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={17} aria-hidden="true" /> Download WebP
          </a>
        </div>
      )}
    </section>
  );
}
