"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, ShieldCheck, Sparkles } from "lucide-react";
import { CANONICAL_PROMPTS } from "@/lib/ai-workspace/canonicalPrompts";
import { createWorkspacePlanFromPrompt } from "@/lib/ai-workspace/planContract";

export default function AiWorkspaceFoundation() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState(null);

  function handlePreview(event) {
    event.preventDefault();
    setResult(createWorkspacePlanFromPrompt(prompt));
  }

  function chooseExample(value) {
    setPrompt(value);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-foreground">Safe preview foundation</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Stage 01 recognizes only the ten exact example requests below. No AI provider, uploaded files,
              credits, job execution, or saved history. Real AI understanding and safe execution arrive in later stages.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePreview} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <label htmlFor="workspace-prompt" className="block text-sm font-semibold text-foreground">
          What would you like to prepare?
        </label>
        <textarea
          id="workspace-prompt"
          rows={3}
          maxLength={500}
          value={prompt}
          onChange={(event) => { setPrompt(event.target.value); setResult(null); }}
          placeholder="Choose an example below to see its approved workflow plan."
          className="mt-3 w-full resize-y rounded-xl border border-border bg-background p-4 text-sm text-foreground outline-none focus:border-primary"
        />
        <button type="submit" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
          <ClipboardList size={18} aria-hidden="true" /> Preview safe plan
        </button>
      </form>

      <section aria-label="Canonical prompt examples">
        <h2 className="font-semibold text-foreground">Try a supported example</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {CANONICAL_PROMPTS.map((item) => (
            <button
              key={item.workflowId}
              type="button"
              onClick={() => chooseExample(item.prompt)}
              className="min-h-12 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground transition hover:border-primary hover:bg-primary/5"
            >
              <span className="block text-xs font-semibold text-primary">{item.workflowId} · {item.label}</span>
              <span className="mt-1 block">{item.prompt}</span>
            </button>
          ))}
        </div>
      </section>

      {result?.kind === "NEEDS_CLARIFICATION" && (
        <div role="status" className="rounded-2xl border border-border bg-surface p-5">
          <p className="font-semibold text-foreground">One clarification needed</p>
          <p className="mt-2 text-sm text-muted">{result.question}</p>
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
              <li key={step.order} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{step.order}</span>
                <div><p className="font-semibold text-foreground">{step.name}</p><p className="text-xs text-muted">{step.toolId}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-muted">Stage 01 cannot process files. Open the existing workflow when you are ready to use its current beta tools.</p>
          <Link href={`/workflows/${result.plan.workflowSlug}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5">
            Open existing workflow <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
