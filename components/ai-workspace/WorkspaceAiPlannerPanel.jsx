"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";

// Optional *paid text-only* provider path. No file bytes, commands, or steps are submitted.
// Disabled at deployment by default; existing local prompt understanding is always free.
export default function WorkspaceAiPlannerPanel({prompt, enabled=false, onOutcome}) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [charge, setCharge] = useState(null);
  const generation = useRef(0);
  const inFlight = useRef(false);

  // Parent keys this component by prompt. Unmount invalidates late network responses.
  useEffect(() => () => {generation.current++;}, []);

  async function askAi() {
    if (!enabled || !consent || !prompt.trim() || inFlight.current) return;
    // A fresh UUID is tied to exactly one explicit paid request; no automatic retries.
    const runGeneration = ++generation.current;
    const requestId = crypto.randomUUID();
    inFlight.current = true;
    setBusy(true);
    setNotice("");
    setCharge(null);
    onOutcome(null); // Require a fresh review after every AI interpretation.
    try {
      const response = await fetch("/api/ai-workspace/planner", {
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt,requestId,approved:true}),
      });
      const data = await response.json();
      if (runGeneration !== generation.current) return; // Stale prompt; never show mismatched result.
      if (!response.ok) {
        setNotice(data?.error || "AI planner unavailable; no automatic retry.");
        return;
      }
      if (!["PLAN","NEEDS_CLARIFICATION"].includes(data?.selection?.kind)) {
        setNotice("Invalid planner response. Please use the local preview.");
        return;
      }
      setConsent(false);
      onOutcome(data.selection);
      setCharge(typeof data.estimatedCostUsd === "number" ? data.estimatedCostUsd : null);
      setNotice(data.charged === false
        ? "Unsupported request was clarified locally; no paid AI request was made."
        : "AI suggestion received. Review the plan before any media processing.");
    } catch {
      if (runGeneration === generation.current) {
        setNotice("Request outcome uncertain. Do not retry automatically; check your AI usage first.");
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <section aria-label="Optional real AI planner" className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ShieldCheck size={21} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-semibold text-foreground">Optional AI prompt interpretation</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            The local Preview button above is free. The separate AI planner sends only your prompt text
            to the provider when you explicitly approve. No image, PDF, or file bytes are sent.
            Do not type passwords, API keys, or other secrets into the prompt.
          </p>
        </div>
      </div>
      {!enabled ? (
        <p role="status" className="mt-3 rounded-lg bg-background p-3 text-sm text-muted">
          Real AI planner is disabled by default. Use the free local preview. An operator must explicitly
          enable the server route AND fund the existing quota/budget controls before paid use.
        </p>
      ) : (
        <>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm text-foreground">
            <input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary" />
            <span>I approve sending this <strong>text prompt</strong> to the AI provider. This can count toward my AI daily/monthly quota and incur paid provider usage. It does NOT authorize processing any files.</span>
          </label>
          <button type="button" disabled={busy || !consent || prompt.trim().length < 3 || prompt.length > 500}
            onClick={askAi}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary/5">
            <Sparkles size={17} aria-hidden="true" /> {busy ? "AI interpreting…" : "Ask AI (may use credits)"}
          </button>
        </>
      )}
      {notice && <p role="status" className="mt-3 text-sm text-muted">{notice}</p>}
      {charge !== null && (
        <p className="mt-2 text-xs text-muted">Estimated AI interpretation cost: ${charge.toFixed(6)} USD (provider estimate, not guaranteed billing).</p>
      )}
    </section>
  );
}
