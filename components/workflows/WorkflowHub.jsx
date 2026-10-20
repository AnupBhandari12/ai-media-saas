"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ClipboardList, Search } from "lucide-react";
import { workflows } from "@/lib/workflows/registry";
import { createWorkflowPreview } from "@/lib/workflows/previewPlan";

const FILTERS = [
  { id: "ALL", label: "All workflows" },
  { id: "P1", label: "Priority 1" },
  { id: "P2", label: "Priority 2" },
  { id: "P3", label: "Priority 3" },
];

export default function WorkflowHub() {
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return workflows.filter((workflow) =>
      (priority === "ALL" || workflow.priority === priority) &&
      [workflow.id, workflow.name, workflow.description, workflow.slug]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [search, priority]);

  function toggle(workflow) {
    if (expandedId === workflow.id) {
      setExpandedId(null);
      setSelectedVariant(null);
    } else {
      setExpandedId(workflow.id);
      setSelectedVariant(workflow.variants[0].id);
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex gap-3">
          <ClipboardList className="mt-0.5 shrink-0 text-primary" size={22} aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-foreground">Workflows • Photo betas and plan previews</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Website, WhatsApp, Email, Job / Form, Instagram, Facebook, LinkedIn, YouTube and E-commerce image branches plus Student Notes photos-to-PDF run locally in your browser.
              Other PDF variants, OCR orchestration, reel, video and AI note summaries remain previews only.
              No file upload, paid AI call or credits in these browser betas.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={19} aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search WhatsApp, Website, Email..."
            aria-label="Search workflows"
            className="min-h-12 w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-foreground outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filter by priority">
          {FILTERS.map((item) => (
            <button
              key={item.id} type="button" onClick={() => setPriority(item.id)}
              aria-pressed={priority === item.id}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                priority === item.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >{item.label}</button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-sm text-muted" aria-live="polite">
        {visible.length} of {workflows.length} workflows
      </p>

      {visible.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-muted">
          No workflows match your search.
        </div>
      ) : (
        <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
          {visible.map((workflow) => {
            const open = expandedId === workflow.id;
            const activeVariant = workflow.variants.find((variant) => variant.id === selectedVariant)
              || workflow.variants[0];
            const preview = open ? createWorkflowPreview(workflow.id, activeVariant.id) : null;

            return (
              <article key={workflow.id} className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{workflow.id}</span>
                  <span className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted">
                    {workflow.priority} • {["WF-01", "WF-02", "WF-03", "WF-04", "WF-05", "WF-06", "WF-07", "WF-08", "WF-09", "WF-10"].includes(workflow.id) ? "Local beta" : "Planned"}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{workflow.name}</h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{workflow.description}</p>
                {workflow.id === "WF-06" && (
                  <Link href="/workflows/website-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Website Ready (local beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-01" && (
                  <Link href="/workflows/whatsapp-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try WhatsApp Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-07" && (
                  <Link href="/workflows/email-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Email Ready (image beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-08" && (
                  <Link href="/workflows/job-form-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Job / Form Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-02" && (
                  <Link href="/workflows/instagram-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Instagram Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-03" && (
                  <Link href="/workflows/facebook-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Facebook Ready (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-04" && (
                  <Link href="/workflows/linkedin-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try LinkedIn Ready (post beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-05" && (
                  <Link href="/workflows/youtube-ready" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try YouTube Ready (thumbnail beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-09" && (
                  <Link href="/workflows/ecommerce-product-pack" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try E-commerce Product Pack (photo beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                {workflow.id === "WF-10" && (
                  <Link href="/workflows/student-notes-pack" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">
                    Try Student Notes Pack (photos to PDF beta) <ArrowRight size={17} aria-hidden="true" />
                  </Link>
                )}
                <button
                  type="button" onClick={() => toggle(workflow)}
                  aria-expanded={open}
                  className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
                >
                  {open ? "Hide step preview" : "View planned steps"}
                  <ChevronDown className={open ? "rotate-180" : ""} size={17} aria-hidden="true" />
                </button>

                {open && preview && (
                  <div className="mt-5 border-t border-border pt-5">
                    <label htmlFor={`variant-${workflow.id}`} className="text-sm font-semibold text-foreground">
                      Output type
                    </label>
                    <select
                      id={`variant-${workflow.id}`}
                      value={activeVariant.id}
                      onChange={(event) => setSelectedVariant(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
                    >
                      {workflow.variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>{variant.name}</option>
                      ))}
                    </select>
                    <ol className="mt-5 space-y-3">
                      {preview.steps.map((step) => (
                        <li key={`${workflow.id}-${activeVariant.id}-${step.order}`} className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {step.order}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{step.name}</p>
                            <p className="mt-0.5 text-xs text-muted">{step.toolId} • {step.registeredToolAvailable ? "Registered available tool" : "Tool coming soon"}</p>
                            {step.registeredToolAvailable ? (
                              <Link href={step.route} className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm font-medium text-primary hover:underline">
                                Open individual tool <ArrowRight size={14} aria-hidden="true" />
                              </Link>
                            ) : null}
                          </div>
                          {step.registeredToolAvailable ? <Check size={17} className="shrink-0 text-primary" aria-hidden="true" /> : null}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-4 text-xs leading-5 text-muted">
                      Only approved browser image/photo workflows and Student Notes photos-to-PDF execute. OCR orchestration, AI summaries, reel, video and other PDF variants remain previews. Always inspect final outputs and receiving requirements.
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
