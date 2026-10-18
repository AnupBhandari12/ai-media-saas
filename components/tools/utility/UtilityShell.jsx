"use client";

import ToolShell from "@/components/tools/ToolShell";
import ProcessingModeBadge, { PROCESSING_MODES } from "@/components/tools/ProcessingModeBadge";

export const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
export const primaryClass = "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:border-primary/50 disabled:opacity-50";

export default function UtilityShell({ toolId, title, description, children, result, error }) {
  return <ToolShell toolId={toolId} title={title} description={description} result={result}>
    <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />
    <p className="mt-3 text-xs leading-5 text-muted">Processed in your browser. Files are not uploaded unless you explicitly choose to save them to a cloud feature.</p>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="mt-5 space-y-5">{children}</div>
  </ToolShell>;
}
