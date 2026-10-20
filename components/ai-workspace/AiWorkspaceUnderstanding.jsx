"use client";

import { useState } from "react";
import { ClipboardList, ShieldCheck, Sparkles } from "lucide-react";
import WorkspacePlanReview from "@/components/ai-workspace/WorkspacePlanReview";
import { UNDERSTANDING_EXAMPLES, understandWorkspacePrompt } from "@/lib/ai-workspace/interpretPrompt";

export default function AiWorkspaceUnderstanding() {
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
              Describe ONE image or photos-to-PDF result. This stage recognizes selected English phrases
              using conservative local rules, not a real AI model. It only previews registered steps;
              it never uploads files, spends credits, or starts processing. Acknowledgment only reveals an approved workflow link.
            </p>
          </div>
        </div>
      </section>

      <form onSubmit={preview} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <label htmlFor="workspace-prompt" className="block text-sm font-semibold text-foreground">
          What do you want to prepare?
        </label>
        <textarea
          id="workspace-prompt"
          rows={3}
          maxLength={500}
          value={prompt}
          onChange={(event) => { setPrompt(event.target.value); setResult(null); }}
          placeholder="For example: Resize this photo for my website"
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-4 text-sm text-foreground outline-none focus:border-primary"
        />
        <button type="submit" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
          <ClipboardList size={18} aria-hidden="true" /> Preview safe plan
        </button>
      </form>

      <section aria-label="Prompt understanding examples">
        <h2 className="font-semibold text-foreground">Try a natural-language example</h2>
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
        <section aria-label="Approved plan preview" className="rounded-2xl border border-primary/20 bg-surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Sparkles size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-bold text-foreground">{result.plan.workflowName}</h2>
              <p className="mt-1 text-sm text-muted">{result.plan.variantName} · Preview only · No cost or execution</p>
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
    </div>
  );
}
