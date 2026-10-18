"use client";

import { useEffect, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import ToolShell from "@/components/tools/ToolShell";
import FileDropzone from "@/components/tools/FileDropzone";
import ProcessingModeBadge, { PROCESSING_MODES } from "@/components/tools/ProcessingModeBadge";
import ProgressPanel from "@/components/tools/ProgressPanel";
import ResultPanel from "@/components/tools/ResultPanel";
import {
  DEV_PDF_BRIDGE,
  DEV_PDF_MAX_BYTES,
  DEV_PDF_UI,
  makeDevPdfDownloadName,
  validateDevPdfSelection,
} from "@/lib/worker/localPdfDevUiConfig";

function displayBytes(bytes) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
    : `${(bytes / 1024).toFixed(1)} KiB`;
}

export default function LocalPdfDevWorkspace({ toolId }) {
  const config = DEV_PDF_UI[toolId];
  const [file, setFile] = useState(null);
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [target, setTarget] = useState("1500");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    return () => { if (result?.url) URL.revokeObjectURL(result.url); };
  }, [result]);

  if (!config) return <p>Unknown PDF tool.</p>;

  const processing = config.operation;
  function onSelected(files) {
    if (busy) return;
    const next = files[0];
    const issue = validateDevPdfSelection(next);
    setError(issue || "");
    setFile(issue ? null : next);
    setResult(null);
  }

  async function run() {
    if (!file || busy) return;
    const issue = validateDevPdfSelection(file);
    if (issue) { setError(issue); return; }
    if (!/^[a-f0-9]{64}$/.test(token.trim())) {
      setError("Paste the 64-character local bridge token shown in your terminal.");
      return;
    }
    let search = `?operation=${encodeURIComponent(processing)}`;
    if (processing === "compress-target") {
      if (!/^[1-9][0-9]{0,4}$/.test(target) || Number(target) < 50 || Number(target) > 25600) {
        setError("Enter a target from 50 to 25600 KiB.");
        return;
      }
      search += `&targetKiB=${encodeURIComponent(target)}`;
    } else if (processing === "protect") {
      if (!/^[A-Za-z0-9][\x21-\x7E]{11,63}$/.test(password)) {
        setError("New password: 12–64 printable ASCII characters, beginning with a letter or number.");
        return;
      }
    } else if (processing === "unlock" && (password.length < 1 || password.length > 128 ||
               new TextEncoder().encode(password).length > 256 || /[\x00-\x1f\x7f]/.test(password))) {
      setError("Enter your known PDF password (1–128 characters; no control characters).");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const secretBytes = new TextEncoder().encode(["compress-target", "repair"].includes(processing) ? "" : password);
      const frame = new Uint8Array(2);
      new DataView(frame.buffer).setUint16(0, secretBytes.length, false);
      // Blob is composed of file + small prefix; does not buffer the PDF in JS memory.
      const payload = new Blob([frame, secretBytes, file], { type: "application/octet-stream" });
      secretBytes.fill(0);
      setPassword("");
      const response = await fetch(`${DEV_PDF_BRIDGE}/process${search}`, {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          "Content-Type": "application/octet-stream",
        },
        body: payload,
      });
      if (!response.ok) {
        const content = await response.json().catch(() => ({}));
        throw new Error(content.error || `Local worker returned HTTP ${response.status}.`);
      }
      if (!response.headers.get("content-type")?.startsWith("application/pdf")) {
        throw new Error("Local worker did not return a PDF.");
      }
      const blob = await response.blob();
      if (!blob.size || blob.size > 50 * 1024 * 1024) {
        throw new Error("Local worker returned an invalid-sized PDF.");
      }
      const outputBytes = Number(response.headers.get("X-PDF-Output-Bytes"));
      const originalBytes = Number(response.headers.get("X-PDF-Original-Bytes"));
      setResult({
        url: URL.createObjectURL(blob),
        name: makeDevPdfDownloadName(file.name, config.outputSuffix),
        originalBytes: Number.isFinite(originalBytes) && originalBytes > 0 ? originalBytes : file.size,
        bytes: Number.isFinite(outputBytes) && outputBytes > 0 ? outputBytes : blob.size,
        targetMet: response.headers.get("X-PDF-Target-Met") === "true",
        method: response.headers.get("X-PDF-Method"),
        sourceIntegrityPassed: response.headers.get("X-PDF-Source-Integrity") === "true",
      });
    } catch (failure) {
      setError(failure instanceof TypeError
        ? "Cannot contact local bridge. Start it in another terminal and check the allowed origin."
        : failure instanceof Error ? failure.message : "PDF processing failed.");
    } finally { setBusy(false); }
  }

  const resultContent = (
    <div className="space-y-4">
      <ProgressPanel status={busy ? "PROCESSING" : error ? "ERROR" : result ? "SUCCESS" : "IDLE"}
        showProgress={false} message={busy ? "Your local Docker worker is processing the PDF. Do not close this tab." :
          error || (result ? "Your PDF is ready in this browser session." : "Choose a PDF to begin.")} />
      {result && (
        <>
          <ResultPanel title="Local PDF ready" description={processing === "compress-target" && !result.targetMet
              ? "The requested target was not met safely. The best checked output is ready."
              : processing === "repair" ? "Best-effort reconstruction. Verify every page, text, links and form fields against your original. Digital signatures may be invalidated."
              : "Review the PDF after download; do not use sensitive documents during development."}
            metadata={[
              { label: "Original", value: displayBytes(result.originalBytes) },
              { label: "Output", value: displayBytes(result.bytes) },
              ...(processing === "repair" ? [
                { label: "Method", value: result.method || "unknown" },
                { label: "Original integrity", value: result.sourceIntegrityPassed ? "Passed" : "Issues detected" },
              ] : []),
              ...(processing === "compress-target" ? [
                { label: "Target", value: `${target} KiB` },
                { label: "Target met", value: result.targetMet ? "Yes" : "No" },
              ] : []),
            ]} />
          <a download={result.name} href={result.url}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            <Download size={18} /> Download PDF
          </a>
        </>
      )}
    </div>
  );

  return (
    <ToolShell toolId={toolId} title={config.title} description={config.description} result={resultContent}>
      <ProcessingModeBadge mode={PROCESSING_MODES.WORKER} />
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
        <ShieldAlert className="mt-0.5 shrink-0" size={19} />
        <span><strong>Developer-only.</strong> Works only with a separately running localhost bridge and Docker Desktop.
          No Vercel, public users, sensitive files or 24/7 service. The bridge token is kept only in this page&apos;s memory.</span>
      </div>
      <label className="mt-5 block text-sm font-semibold text-foreground" htmlFor="pdf-dev-token">Local bridge token</label>
      <input id="pdf-dev-token" value={token} onChange={e=>setToken(e.target.value)} type="password"
        autoComplete="off" spellCheck={false} placeholder="Paste 64-character token from terminal"
        className="mt-2 w-full rounded-xl border border-border bg-background p-3 font-mono text-sm text-foreground" />
      <div className="mt-5">
        <FileDropzone accept=".pdf,application/pdf" multiple={false} maxSizeBytes={DEV_PDF_MAX_BYTES}
          disabled={busy} onFilesSelected={onSelected} title="Choose one PDF"
          description="Only your own non-sensitive test PDFs. Maximum 25 MiB." />
      </div>
      {file && <p className="mt-3 break-all text-sm text-foreground">{file.name} · {displayBytes(file.size)}</p>}
      {processing === "compress-target" ? (
        <div className="mt-5">
          <label htmlFor="pdf-dev-target" className="text-sm font-semibold text-foreground">Target size (KiB)</label>
          <input id="pdf-dev-target" value={target} onChange={e=>setTarget(e.target.value)}
            type="number" min={50} max={25600} step={1}
            className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
          <p className="mt-2 text-xs text-muted">50–25600 KiB. Reducing scan quality can harm readability; exact target not guaranteed.</p>
        </div>
      ) : processing === "repair" ? (
        <p className="mt-5 rounded-xl border border-border bg-background p-3 text-sm text-muted">
          No password needed. This best-effort tool may change forms, annotations, accessibility and digital signatures.
          Do not use the result without visually comparing every page.
        </p>
      ) : (
        <div className="mt-5">
          <label htmlFor="pdf-dev-password" className="text-sm font-semibold text-foreground">
            {processing === "protect" ? "New PDF password" : "Known PDF password"}
          </label>
          <input id="pdf-dev-password" type="password" autoComplete="off" value={password}
            onChange={e=>setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground" />
          <p className="mt-2 text-xs text-muted">
            {processing === "protect" ? "Use a unique strong password (12–64 printable ASCII characters)." :
              "Only unlock files you own or have permission to open. No password recovery or guessing."}
          </p>
        </div>
      )}
      <button type="button" disabled={!file || busy} onClick={run}
        className="mt-6 min-h-11 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Processing locally…" : config.action}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
    </ToolShell>
  );
}
