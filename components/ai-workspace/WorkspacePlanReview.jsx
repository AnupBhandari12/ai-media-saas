"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { acknowledgeWorkspacePlan, createWorkspaceReview } from "@/lib/ai-workspace/reviewGate";
import WorkspaceWebsiteRun from "@/components/ai-workspace/WorkspaceWebsiteRun";

export default function WorkspacePlanReview({ plan }) {
  const [checked, setChecked] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  let review;
  try {
    review = createWorkspaceReview(plan);
  } catch {
    return <p role="alert" className="mt-5 text-sm text-red-600">This plan is invalid. Please preview again.</p>;
  }

  function acknowledge() {
    try {
      const next = acknowledgeWorkspacePlan(plan, checked);
      setReceipt(next.kind === "ACKNOWLEDGED_FOR_NAVIGATION" ? next : null);
      setError(next.kind === "ACKNOWLEDGED_FOR_NAVIGATION" ? "" : "Please check the review box first.");
    } catch {
      setReceipt(null);
      setError("The plan changed. Please preview again.");
    }
  }

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={20} aria-hidden="true" />
        <div>
          <h3 className="font-semibold text-foreground">Step 3 · Review & acknowledge</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Verify the destination and {review.steps.length} listed steps above. This preview makes no upload,
            provider call, credit charge, or file change. The final workflow has its own controls.
          </p>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm text-foreground">
        <input type="checkbox" checked={checked}
          onChange={(event) => { setChecked(event.target.checked); setReceipt(null); setError(""); }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
        <span>I reviewed this <strong>{review.workflowName}</strong> plan and understand that acknowledging does not process my file.</span>
      </label>
      <button type="button" onClick={acknowledge} disabled={!checked}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-primary-hover">
        Acknowledge plan
      </button>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {receipt?.kind === "ACKNOWLEDGED_FOR_NAVIGATION" && checked && (
        <div role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">Plan acknowledged · no action executed</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            You may open the existing approved workflow to configure and run it. For Website Ready only,
            you can also choose a local image and click Run below. Review alone executes nothing.
          </p>
          <Link href={receipt.workflowHref}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">
            Open approved workflow <ArrowRight size={18} aria-hidden="true" />
          </Link>
          {plan.workflowId === "WF-06" && plan.variantId === "image" && (
            <WorkspaceWebsiteRun plan={plan} />
          )}
        </div>
      )}
    </div>
  );
}
