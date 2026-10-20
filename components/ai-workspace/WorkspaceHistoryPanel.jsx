"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, History, Trash2 } from "lucide-react";

const STATUS_CHOICES = [
  { value: "SAVED", label: "Saved" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done (self-marked)" },
];

// Separate opt-in metadata history. Saving a plan does NOT execute a workflow or charge credits.
export default function WorkspaceHistoryPanel({ plan, prompt }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async ({ signal } = {}) => {
    const response = await fetch("/api/ai-workspace/history", { credentials: "same-origin", cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.records)) throw new Error(data.error || "History unavailable.");
    return data.records;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refresh({ signal: controller.signal })
      .then(items => { if (!controller.signal.aborted) setRecords(items); })
      .catch(() => { if (!controller.signal.aborted) setError("History unavailable. Apply the Stage 06 database migration and try again."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  async function savePlan() {
    if (!plan || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/ai-workspace/history", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt || "", workflowId: plan.workflowId, variantId: plan.variantId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save plan.");
      setRecords(await refresh());
      setMessage("Plan saved to your private history. No file was processed.");
    } catch (err) { setError(err.message || "Could not save plan."); }
    finally { setBusy(false); }
  }

  async function changeStatus(id, taskStatus) {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/ai-workspace/history/${encodeURIComponent(id)}`, {
        method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not change status.");
      setRecords(await refresh());
      setMessage("Status changed. This is your manual task label, not a processing-job result.");
    } catch (err) { setError(err.message || "Could not change status."); }
    finally { setBusy(false); }
  }

  async function deleteRecord(id) {
    if (busy || !window.confirm("Delete this saved history item? This cannot be undone.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/ai-workspace/history/${encodeURIComponent(id)}`, {
        method: "DELETE", credentials: "same-origin",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete entry.");
      setRecords(await refresh());
      setMessage("History item deleted.");
    } catch (err) { setError(err.message || "Could not delete item."); }
    finally { setBusy(false); }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-label="Optional workspace history">
      <div className="flex items-start gap-3">
        <History size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your private plan history</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Nothing is saved automatically. Use Save current plan only when you want to store its text prompt
            and registered workflow details in your account. No media files or AI responses are stored here.
            Task labels are manual notes, not proof of a completed processing job. Up to 30 saved items per account.
          </p>
        </div>
      </div>
      <button type="button" onClick={savePlan} disabled={!plan || busy}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
        <BookmarkPlus size={17} aria-hidden="true" /> {busy ? "Saving / updating…" : "Save current plan (opt-in)"}
      </button>
      {!plan && <p className="mt-2 text-xs text-muted">Preview a supported workflow plan above to enable saving.</p>}
      {message && <p role="status" className="mt-3 text-sm text-primary">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 border-t border-border pt-4">
        <h3 className="font-semibold text-foreground">Saved plans · {records.length}</h3>
        {loading ? <p className="mt-3 text-sm text-muted">Loading your history…</p> :
        records.length === 0 ? <p className="mt-3 text-sm text-muted">No saved plans yet.</p> :
        <ul className="mt-3 space-y-3">
          {records.map(record => (
            <li key={record.id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{record.workflowName} <span className="text-xs font-normal text-muted">{record.workflowId} · {record.variantName}</span></p>
                  {record.prompt && <p className="mt-1 break-words text-sm text-muted">{record.prompt}</p>}
                  {record.createdAt && <p className="mt-1 text-xs text-muted">Saved {new Date(record.createdAt).toLocaleString()}</p>}
                </div>
                <button type="button" aria-label={`Delete ${record.workflowName} history item`} disabled={busy}
                  onClick={() => deleteRecord(record.id)} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border px-3 text-xs text-red-600 disabled:opacity-50">
                  <Trash2 size={15} aria-hidden="true" /> Delete
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs text-muted" htmlFor={`status-${record.id}`}>Manual task label</label>
                <select id={`status-${record.id}`} value={record.taskStatus} disabled={busy}
                  onChange={event => changeStatus(record.id, event.target.value)}
                  className="min-h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground">
                  {STATUS_CHOICES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
                {record.workflowHref && <Link href={record.workflowHref} className="inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline">Open workflow</Link>}
              </div>
            </li>
          ))}
        </ul>}
      </div>
    </section>
  );
}
