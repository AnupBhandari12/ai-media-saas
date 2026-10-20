"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, History, RefreshCw, Trash2 } from "lucide-react";

const STATUS_CHOICES = [
  { value: "SAVED", label: "Saved" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "DONE", label: "Done (self-marked)" },
];
const STATUS_FILTERS = [{ value: "ALL", label: "All statuses" }, ...STATUS_CHOICES];

// Metadata-only, voluntary plan history. No media is processed and no paid AI call is made here.
export default function WorkspaceHistoryPanel({ plan, prompt }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async ({ signal } = {}) => {
    const response = await fetch("/api/ai-workspace/history", {
      credentials: "same-origin", cache: "no-store", signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !Array.isArray(data?.records)) {
      throw new Error(response.status === 401
        ? "Please sign in again to access your saved plans."
        : data?.error || "History temporarily unavailable. Try refreshing.");
    }
    return data.records;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory({ signal: controller.signal })
      .then(items => {
        if (controller.signal.aborted) return;
        setRecords(items); setLoaded(true);
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err.message || "History unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [fetchHistory]);

  async function refreshList() {
    if (loading || busy) return;
    setLoading(true); setError(""); setMessage("");
    try {
      setRecords(await fetchHistory());
      setLoaded(true);
      setMessage("History refreshed.");
    } catch (err) {
      setError(err.message || "Could not refresh history.");
    } finally {
      setLoading(false);
    }
  }

  async function writeHistory(url, { method, body }) {
    const response = await fetch(url, {
      method, credentials: "same-origin",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "History change failed. Please refresh before trying again.");
    if (!data || typeof data !== "object") throw new Error("History response was incomplete. Refresh before retrying.");
    return data;
  }

  async function savePlan() {
    if (!plan || busy || loading || !loaded || records.length >= 30) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await writeHistory("/api/ai-workspace/history", {
        method: "POST",
        body: { prompt: prompt || "", workflowId: plan.workflowId, variantId: plan.variantId },
      });
      if (!data.record?.id) {
        setError("Save response was incomplete. Refresh history before saving again.");
        return;
      }
      // Server returned a saved record. Do not show a false 'save failed' due to a later GET.
      setRecords(items => [data.record, ...items.filter(item => item.id !== data.record.id)].slice(0, 30));
      setFilter("ALL");
      setMessage("Plan saved to your private history. No file was processed.");
    } catch (err) {
      setError(err.message || "Save outcome uncertain. Refresh history before retrying.");
    } finally { setBusy(false); }
  }

  async function changeStatus(id, taskStatus) {
    if (busy || loading || !loaded) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await writeHistory(`/api/ai-workspace/history/${encodeURIComponent(id)}`, {
        method: "PATCH", body: { taskStatus },
      });
      if (data.ok !== true) {
        setError("Update response was incomplete. Refresh history before retrying.");
        return;
      }
      setRecords(items => items.map(item => item.id === id ? { ...item, taskStatus } : item));
      setMessage("Manual task label updated; this does not indicate actual processing.");
    } catch (err) { setError(err.message || "Update outcome uncertain. Refresh history."); }
    finally { setBusy(false); }
  }

  async function deleteRecord(id) {
    if (busy || loading || !loaded || !window.confirm("Delete this saved history item? This cannot be undone.")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await writeHistory(`/api/ai-workspace/history/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (data.ok !== true) {
        setError("Delete response was incomplete. Refresh history before retrying.");
        return;
      }
      setRecords(items => items.filter(item => item.id !== id));
      setMessage("History item deleted.");
    } catch (err) { setError(err.message || "Delete outcome uncertain. Refresh history."); }
    finally { setBusy(false); }
  }

  const visibleRecords = filter === "ALL" ? records : records.filter(item => item.taskStatus === filter);

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6" aria-label="Optional workspace history" aria-busy={loading || busy}>
      <div className="flex items-start gap-3">
        <History size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Your private plan history</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Nothing is saved automatically. Save only when you want to keep a text prompt and registered workflow details.
            Do not save secrets or sensitive personal information. Records remain until you delete them.
            No media or AI-provider response is stored. Task labels are manual, not proof of a completed job.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={savePlan} disabled={!plan || busy || loading || !loaded || records.length >= 30}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <BookmarkPlus size={17} aria-hidden="true" /> {busy ? "Saving / updating…" : "Save current plan (opt-in)"}
        </button>
        <button type="button" onClick={refreshList} disabled={loading || busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50">
          <RefreshCw size={16} aria-hidden="true" /> {loading ? "Loading…" : "Refresh history"}
        </button>
      </div>
      {!plan && <p className="mt-2 text-xs text-muted">Preview a supported workflow plan above to enable saving.</p>}
      {records.length >= 30 && <p className="mt-2 text-xs text-muted">History is full (30 items). Delete an item to save another.</p>}
      {message && <p role="status" className="mt-3 text-sm text-primary">{message}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-5 border-t border-border pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">Saved plans · {records.length}/30</h3>
          <div className="flex items-center gap-2">
            <label htmlFor="history-status-filter" className="text-xs text-muted">Show</label>
            <select id="history-status-filter" value={filter} onChange={event => setFilter(event.target.value)}
              className="min-h-11 max-w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground">
              {STATUS_FILTERS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
        {loading && !loaded ? <p role="status" className="mt-3 text-sm text-muted">Loading your history…</p> :
        !loaded ? <p className="mt-3 text-sm text-muted">History could not be loaded. Use Refresh history to try again.</p> :
        visibleRecords.length === 0 ? <p className="mt-3 text-sm text-muted">{records.length ? "No plans match this status." : "No saved plans yet."}</p> :
        <ul className="mt-3 space-y-3">
          {visibleRecords.map(record => (
            <li key={record.id} className="min-w-0 rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-foreground">{record.workflowName} <span className="text-xs font-normal text-muted">{record.workflowId} · {record.variantName}</span></p>
                  {record.prompt && <p className="mt-1 break-words text-sm text-muted">{record.prompt}</p>}
                  {record.createdAt && <p className="mt-1 text-xs text-muted">Saved {new Date(record.createdAt).toLocaleString()}</p>}
                </div>
                <button type="button" aria-label={`Delete ${record.workflowName} history item`} disabled={busy || loading}
                  onClick={() => deleteRecord(record.id)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-xs text-red-600 disabled:opacity-50">
                  <Trash2 size={15} aria-hidden="true" /> Delete
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="text-xs text-muted" htmlFor={`status-${record.id}`}>Manual task label</label>
                <select id={`status-${record.id}`} value={record.taskStatus} disabled={busy || loading}
                  onChange={event => changeStatus(record.id, event.target.value)}
                  className="min-h-11 max-w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground">
                  {STATUS_CHOICES.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
                {record.workflowHref && <Link href={record.workflowHref} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline">Open workflow</Link>}
              </div>
            </li>
          ))}
        </ul>}
      </div>
    </section>
  );
}
