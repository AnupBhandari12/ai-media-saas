"use client";

import { useEffect, useState } from "react";
import { Download, FileCheck2, RefreshCcw, XCircle } from "lucide-react";

import ToolShell from "@/components/tools/ToolShell";
import FileDropzone from "@/components/tools/FileDropzone";
import ProgressPanel from "@/components/tools/ProgressPanel";
import ResultPanel from "@/components/tools/ResultPanel";
import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";
import {
  OFFICE_UI_MAX_BYTES,
  canCancelOfficeJob,
  formatOfficeBytes,
  getOfficeJobMessage,
  getOfficeUiTool,
  validateOfficeSelection,
} from "@/lib/worker/officeUiConfig";

async function apiJson(url, options) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Our API's public error messages are intentionally sanitized.
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }
  return payload;
}

export default function OfficeToPdfWorkspace({ toolId }) {
  const config = getOfficeUiTool(toolId);
  const [file, setFile] = useState(null);
  const [job, setJob] = useState(null);
  const [phase, setPhase] = useState("SELECT");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const jobId = job?.id;
  const jobStatus = job?.status;

  // Only poll after the server has confirmed a verified immutable input.
  // No automatic worker dispatch exists yet: a trusted operator runs B3 manually.
  useEffect(() => {
    if (!jobId || phase !== "WAITING") return;
    let disposed = false;
    let checking = false;

    async function refresh() {
      if (checking) return;
      checking = true;
      try {
        const result = await apiJson(`/api/worker/jobs/${jobId}`);
        if (disposed) return;
        setJob(result.job);
        if (result.job.status === "COMPLETED") {
          setPhase("DONE");
          setError("");
        } else if (result.job.status === "FAILED" || result.job.status === "CANCELLED") {
          setPhase("STOPPED");
        }
      } catch {
        if (!disposed) setNote("Could not refresh status. Retrying automatically; check the local server connection.");
      } finally {
        checking = false;
      }
    }

    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [jobId, phase]);

  if (!config) return <p>Unknown document conversion tool.</p>;

  const active = jobStatus === "PENDING" || jobStatus === "PROCESSING";
  const awaitingUpload = jobStatus === "PENDING" &&
    ["AWAITING_UPLOAD", "UPLOADING"].includes(job?.stage);
  const terminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(jobStatus);
  const canUpload = Boolean(file) && !busy && !downloading &&
    (!active || awaitingUpload);
  const isProcessing = busy || active;
  const progressMessage = busy ? {
    RESERVING: "Creating a private job reservation...",
    SIGNING: "Generating a temporary upload URL...",
    UPLOADING: "Uploading directly to private Backblaze B2 storage...",
    VERIFYING: "Verifying file size and type, then freezing a private copy...",
  }[phase] || "Preparing upload..." : getOfficeJobMessage(job);

  function selectFiles(files) {
    if (busy || active) return;
    const selected = files[0];
    const validationError = validateOfficeSelection(toolId, selected);
    setError(validationError || "");
    if (validationError) {
      setFile(null);
      return;
    }
    setFile(selected);
    setJob(null);
    setPhase("SELECT");
    setNote("");
  }

  async function uploadDocument() {
    if (!canUpload) return;
    const validationError = validateOfficeSelection(toolId, file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      let current = job;
      if (!awaitingUpload) {
        setPhase("RESERVING");
        const reservation = await apiJson("/api/worker/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toolId, filename: file.name, bytes: file.size }),
        });
        current = reservation.job;
        setJob(current);
      }

      setPhase("SIGNING");
      const upload = await apiJson(`/api/worker/jobs/${current.id}/upload`, {
        method: "POST",
      });
      setJob((previous) => ({ ...previous, stage: "UPLOADING" }));
      setPhase("UPLOADING");
      // Exact Content-Type must match the signed request. Don't add extra headers.
      const sent = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: upload.headers,
        body: file,
      });
      if (!sent.ok) throw new Error(`Document upload failed (HTTP ${sent.status}). Check the bucket's S3 PUT CORS rule.`);
      setPhase("VERIFYING");
      const confirmation = await apiJson(`/api/worker/jobs/${current.id}/confirm`, {
        method: "POST",
      });
      setJob((previous) => ({ ...previous, ...confirmation.job }));
      setPhase("WAITING");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Upload could not be completed.");
      setPhase("ERROR");
    } finally {
      setBusy(false);
    }
  }

  async function cancelJob() {
    if (!canCancelOfficeJob(job) || busy) return;
    setBusy(true);
    setError("");
    try {
      const cancelled = await apiJson(`/api/worker/jobs/${job.id}`, { method: "DELETE" });
      setJob(cancelled.job);
      setPhase("STOPPED");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Cancellation failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resumeLatest() {
    if (busy || active) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await apiJson("/api/worker/jobs");
      const recent = result.jobs?.find((entry) => entry.toolId === toolId &&
        (entry.stage === "READY_FOR_PROCESSING" || entry.status === "PROCESSING" ||
         entry.status === "COMPLETED"));
      if (!recent) {
        setNote("No uploaded or completed document job found for this tool.");
        return;
      }
      setFile(null);
      setJob(recent);
      setPhase(recent.status === "COMPLETED" ? "DONE" : "WAITING");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not resume job.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (job?.status !== "COMPLETED" || downloading) return;
    setDownloading(true);
    setError("");
    try {
      // Get a FRESH 90-second link on every click. Never store it in React state.
      const result = await apiJson(`/api/worker/jobs/${job.id}/download`);
      window.location.assign(result.downloadUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not prepare PDF download.");
    } finally {
      setDownloading(false);
    }
  }

  function startAnother() {
    if (busy || active) return;
    setFile(null);
    setJob(null);
    setError("");
    setNote("");
    setPhase("SELECT");
  }

  const resultContent = (
    <div className="space-y-4">
      <ProgressPanel
        status={jobStatus === "COMPLETED" ? "SUCCESS" :
          jobStatus === "FAILED" || jobStatus === "CANCELLED" || (error && !active) ? "ERROR" :
          isProcessing ? "PROCESSING" : "IDLE"}
        progress={job?.progress ?? 0}
        message={progressMessage}
      />
      {jobStatus === "COMPLETED" && (
        <ResultPanel
          title="Converted PDF ready"
          description="Your converted PDF is in private temporary storage. Review its layout after download."
          metadata={[
            { label: "Source", value: job.filename || "Office document" },
            { label: "Tool", value: config.title },
            { label: "Output", value: "PDF" },
            { label: "Storage", value: "Private, temporary" },
          ]}
        />
      )}
      {jobStatus === "COMPLETED" && (
        <button type="button" onClick={downloadPdf} disabled={downloading}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
          <Download size={17} /> {downloading ? "Preparing download..." : "Download PDF"}
        </button>
      )}
      {canCancelOfficeJob(job) && !busy && (
        <button type="button" onClick={cancelJob}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-muted hover:text-foreground">
          <XCircle size={17} /> Cancel pending job
        </button>
      )}
      {jobStatus === "PENDING" && job.stage === "READY_FOR_PROCESSING" && (
        <div className="rounded-xl border border-border bg-surface p-4 text-sm leading-6 text-muted">
          <p className="font-semibold text-foreground">Local development: run the worker manually</p>
          <p className="mt-1">In another PowerShell terminal on your trusted PC, run:</p>
          <code className="mt-2 block break-all rounded-lg bg-background p-3 text-xs text-foreground">bun --env-file=.env.local scripts/worker/run-once.mjs</code>
          <p className="mt-2">It handles one oldest ready job. This page refreshes the status automatically.</p>
        </div>
      )}
    </div>
  );

  return (
    <ToolShell
      toolId={toolId}
      title={config.title}
      description={config.description}
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.WORKER} />
      <p className="mt-4 rounded-xl border border-border bg-background p-3 text-sm leading-6 text-muted">
        Private development tool. Processing runs on a trusted local Docker worker; it is not an always-on cloud service yet.
      </p>
      <div className="mt-5">
        <FileDropzone
          accept={config.accept}
          multiple={false}
          maxSizeBytes={OFFICE_UI_MAX_BYTES}
          disabled={busy || active}
          onFilesSelected={selectFiles}
          title={`Choose a ${config.label}`}
          description={`Supported: ${config.accept} · Maximum 25 MiB. Use only non-sensitive test files.`}
        />
      </div>
      {file && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-background p-4">
          <FileCheck2 size={20} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="break-all text-sm font-semibold text-foreground">{file.name}</p>
            <p className="mt-1 text-xs text-muted">{formatOfficeBytes(file.size)}</p>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {note && <p role="status" className="mt-4 text-sm text-muted">{note}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        {canUpload && (
          <button type="button" onClick={uploadDocument}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
            {awaitingUpload ? "Retry private upload" : "Upload securely"}
          </button>
        )}
        {!active && (
          <button type="button" onClick={resumeLatest} disabled={busy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40 disabled:opacity-60">
            <RefreshCcw size={16} /> Resume latest job
          </button>
        )}
        {terminal && (
          <button type="button" onClick={startAnother} disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground hover:border-primary/40">
            Convert another
          </button>
        )}
      </div>
      {job && (
        <p className="mt-4 text-xs text-muted">
          Job ID: <span className="break-all font-mono">{job.id}</span>
        </p>
      )}
    </ToolShell>
  );
}
