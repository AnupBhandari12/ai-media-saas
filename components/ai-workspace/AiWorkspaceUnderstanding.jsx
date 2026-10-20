"use client";

import { useState } from "react";
import { ClipboardList, ShieldCheck, Sparkles } from "lucide-react";
import WorkspacePlanReview from "@/components/ai-workspace/WorkspacePlanReview";
import WorkspaceAiPlannerPanel from "@/components/ai-workspace/WorkspaceAiPlannerPanel";
import WorkspaceHistoryPanel from "@/components/ai-workspace/WorkspaceHistoryPanel";
import { UNDERSTANDING_EXAMPLES, understandWorkspacePrompt } from "@/lib/ai-workspace/interpretPrompt";

export default function AiWorkspaceUnderstanding({ realAiEnabled = false }) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);

  function preview(event) {
    event.preventDefault();
    setResult(understandWorkspacePrompt(prompt));
  }

  function selectExample(value) {
    setPrompt(value);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-foreground">Prompt understanding & review · safe beta</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Describe ONE image or photos-to-PDF result. Free local preview uses conservative rules;
              the optional AI interpreter is a separate, explicitly confirmed paid text request.
              Neither preview executes media tools. Acknowledgment only reveals approved execution controls.
              Saved plans are optional and separate from processing history.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={preview} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <label htmlFor="workspace-prompt" className="block text-sm font-semibold text-foreground">
          Step 1 · Describe your output
        </label>
        <textarea
          id="workspace-prompt"
          rows={3}
          maxLength={500}
          value={prompt}
          onChange={(event) => { setPrompt(event.target.value); setResult(null); }}
          placeholder="For example: Resize this photo for my website"
          aria-describedby="workspace-prompt-hint"
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-4 text-sm text-foreground outline-none focus:border-primary"
        />
        <div id="workspace-prompt-hint" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>One destination at a time. Avoid passwords, API keys and private details.</span>
          <span aria-live="off">{prompt.length}/500 characters</span>
        </div>
        <button type="submit" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <ClipboardList size={18} aria-hidden="true" /> Preview safe plan
        </button>
      </form>

      <WorkspaceAiPlannerPanel key={prompt} prompt={prompt} enabled={realAiEnabled} onOutcome={setResult} />

      <section aria-label="Prompt understanding examples">
        <h2 className="font-semibold text-foreground">Or choose a supported example</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {UNDERSTANDING_EXAMPLES.map((item) => (
            <button key={item.workflowId} type="button" onClick={() => selectExample(item.prompt)}
              className="min-h-12 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary/5">
              <span className="block text-xs font-semibold text-primary">{item.workflowId} · {item.label}</span>
              <span className="mt-1 block">{item.prompt}</span>
            </button>
          ))}
        </div>
      </section>

      {result?.kind === "NEEDS_CLARIFICATION" && (
        <div role="status" className="rounded-2xl border border-border bg-surface p-5">
          <p className="font-semibold text-foreground">One clarification needed</p>
          <p className="mt-2 text-sm leading-6 text-muted">{result.question}</p>
          <p className="mt-3 text-xs text-muted">Try a more specific image request or choose an example. Nothing was executed.</p>
        </div>
      )}
      {result?.kind === "PLAN" && (
        <section aria-label="Approved plan preview" aria-live="polite" className="rounded-2xl border border-primary/20 bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Sparkles size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-bold text-foreground">{result.plan.workflowName}</h2>
              <p className="mt-1 text-sm text-muted">{result.plan.variantName} · Workflow preview only · No media processing</p>
            </div>
          </div>
          <ol className="mt-5 space-y-3">
            {result.plan.steps.map((step) => (
              <li key={step.toolId} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{step.order}</span>
                <div><p className="font-semibold text-foreground">{step.name}</p><p className="text-xs text-muted">{step.toolId}</p></div>
              </li>
            ))}
          </ol>
          <WorkspacePlanReview key={`${result.plan.workflowId}:${result.plan.variantId}:${result.plan.steps.map((step) => step.toolId).join(",")}`} plan={result.plan} />
        </section>
      )}
      <WorkspaceHistoryPanel plan={result?.kind === "PLAN" ? result.plan : null} prompt={prompt} />
    </div>
  );
}
