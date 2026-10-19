"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCopy,
  FlaskConical,
  Info,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import LocalCaptionDraftLab from "@/components/ai/LocalCaptionDraftLab";
import RealCaptionLab from "@/components/ai/RealCaptionLab";

import {
  CAPTION_EXAMPLES,
  CAPTION_MAX_CHARACTERS,
  CAPTION_PREVIEW_ENDPOINT,
  CAPTION_QUOTA_ENDPOINT,
  createCaptionPreviewBody,
  getCaptionPreviewError,
  parseCaptionQuota,
  parseLocalCaptionPreview,
  validateCaptionDescription,
} from "@/lib/ai/aiCaptionUi.mjs";

function QuotaTile({ title, data }) {
  const ratio = data && data.limit > 0
    ? Math.min(100, Math.max(0, (data.used / data.limit) * 100))
    : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <span className="text-xs font-medium text-slate-500">UTC</span>
      </div>
      {data ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{data.remaining}</span>
            <span className="text-sm text-slate-500">remaining / {data.limit}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar"
            aria-valuemin={0} aria-valuemax={data.limit} aria-valuenow={Math.min(data.used, data.limit)}
            aria-label={`${title} quota used`}>
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${ratio}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{data.used} reserved slot{data.used === 1 ? "" : "s"}</p>
        </>
      ) : (
        <div className="text-sm text-slate-500">Unavailable</div>
      )}
    </div>
  );
}

export default function CaptionGeneratorClient() {
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState(null);
  const [draft, setDraft] = useState("");
  const [quota, setQuota] = useState(null);
  const [quotaError, setQuotaError] = useState("");
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const abortRef = useRef(null);

  const validation = useMemo(
    () => validateCaptionDescription(description),
    [description]
  );

  useEffect(() => {
    const controller = new AbortController();
    async function loadQuota() {
      try {
        const response = await fetch(CAPTION_QUOTA_ENDPOINT, {
          method: "GET", credentials: "same-origin", cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Quota could not be loaded.");
        const payload = await response.json();
        if (!controller.signal.aborted) {
          setQuota(parseCaptionQuota(payload));
          setQuotaError("");
        }
      } catch {
        if (!controller.signal.aborted) setQuotaError("Quota unavailable. Check your connection or sign-in session.");
      } finally {
        if (!controller.signal.aborted) setIsLoadingQuota(false);
      }
    }
    void loadQuota();
    return () => {
      controller.abort();
      abortRef.current?.abort();
    };
  }, []);

  function updateDescription(next) {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsSubmitting(false);
    setDescription(next);
    setPreview(null);
    setDraft("");
    setFormError("");
    setCopyStatus("");
  }

  async function handlePreview(event) {
    event.preventDefault();
    if (!validation.valid || isSubmitting) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsSubmitting(true);
    setFormError("");
    setCopyStatus("");
    setPreview(null);

    try {
      const response = await fetch(CAPTION_PREVIEW_ENDPOINT, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createCaptionPreviewBody(description)),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(getCaptionPreviewError(response.status));
      const payload = await response.json();
      const result = parseLocalCaptionPreview(payload);
      if (controller.signal.aborted) return;
      setPreview(result);
      setDraft(result.text);
      setQuota(result.quota);
      setQuotaError("");
    } catch (error) {
      if (!controller.signal.aborted) {
        setFormError(error instanceof Error ? error.message : "Preview failed.");
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsSubmitting(false);
      }
    }
  }

  async function handleCopy() {
    if (!draft.trim()) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopyStatus("Copied to clipboard");
    } catch {
      setCopyStatus("Could not copy. Select and copy the text manually.");
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <div className="mx-auto max-w-6xl">
        <Link href="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tools
        </Link>

        <div className="mt-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold tracking-wide text-indigo-700">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> LOCAL MOCK PREVIEW
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Caption Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Explore the caption-writing flow, experiment with descriptions, and edit your draft.
              This preview produces placeholder text, not a real AI-generated caption.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Local tools free · Real AI requires approval
          </div>
        </div>

        <LocalCaptionDraftLab />
        <RealCaptionLab />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Describe your post</h2>
                  <p className="text-xs text-slate-500">Add a few details so your preview has useful context</p>
                </div>
              </div>
            </div>

            <form onSubmit={handlePreview} className="space-y-6 px-5 py-6 sm:px-7">
              <div>
                <label htmlFor="caption-description" className="mb-2 block text-sm font-semibold text-slate-800">
                  Post description
                </label>
                <textarea id="caption-description" value={description} onChange={(event) => updateDescription(event.target.value)}
                  rows={7} maxLength={CAPTION_MAX_CHARACTERS + 40}
                  placeholder="Example: A behind-the-scenes moment from our first product photoshoot. The team is smiling in the studio..."
                  aria-describedby="caption-description-hint"
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
                <div id="caption-description-hint" className="mt-2 flex justify-between gap-3 text-xs">
                  <span className={validation.valid || !description ? "text-slate-500" : "text-amber-700"}>
                    {!description ? "3–1,200 characters. Text only." : validation.message}
                  </span>
                  <span className={description.length > CAPTION_MAX_CHARACTERS ? "font-semibold text-red-700" : "text-slate-500"}>
                    {description.length}/{CAPTION_MAX_CHARACTERS}
                  </span>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Try an example</p>
                <div className="flex flex-wrap gap-2">
                  {CAPTION_EXAMPLES.map((example) => (
                    <button key={example.label} type="button" onClick={() => updateDescription(example.text)}
                      className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700">
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={!validation.valid || isSubmitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                  {isSubmitting ? "Building preview..." : "Create mock preview"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => updateDescription("")}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Clear
                </button>
              </div>
              {formError && (
                <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                  {formError}
                </p>
              )}
              <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                The preview endpoint works only in local development when explicitly enabled.
                No credits or quota slots are consumed by this mock preview.
              </p>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-slate-900">Your draft preview</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">NOT AI GENERATED</span>
              </div>
              {preview ? (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-medium text-amber-800">Mock content • Editable local draft • No AI credits spent</p>
                  <label htmlFor="caption-draft" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Edit preview text</label>
                  <textarea id="caption-draft" value={draft} onChange={(event) => { setDraft(event.target.value); setCopyStatus(""); }}
                    rows={7} maxLength={2000}
                    className="w-full resize-y rounded-2xl border border-indigo-100 bg-indigo-50/40 px-4 py-4 text-sm leading-6 text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">You can revise this mock text locally.</span>
                    <button type="button" onClick={handleCopy} disabled={!draft.trim()}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      {copyStatus === "Copied to clipboard" ? <Check className="h-4 w-4" aria-hidden="true" /> : <ClipboardCopy className="h-4 w-4" aria-hidden="true" />}
                      Copy draft
                    </button>
                  </div>
                  {copyStatus && <p role="status" className="text-xs text-slate-600">{copyStatus}</p>}
                </div>
              ) : (
                <div className="mt-5 flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-9 text-center">
                  <div className="rounded-2xl bg-white p-4 text-indigo-400 shadow-sm">
                    <FlaskConical className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-800">No preview yet</p>
                  <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Describe your content on the left, then create a local mock preview.</p>
                </div>
              )}
            </section>

            <section aria-label="AI action quota" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-slate-900">AI action quota</h2>
                <span className="text-xs text-slate-500">Read-only usage</span>
              </div>
              {isLoadingQuota ? (
                <p role="status" className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">Loading quota...</p>
              ) : quotaError ? (
                <p role="alert" className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">{quotaError}</p>
              ) : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <QuotaTile title="Today" data={quota?.daily} />
                <QuotaTile title="This month" data={quota?.monthly} />
              </div>
              {quota && !quota.allowed && (
                <p className="text-xs font-medium text-amber-800">Your AI quota is currently exhausted. This mock tool still does not use quota.</p>
              )}
            </section>

            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-indigo-950">Built for safe local testing</p>
                <p className="mt-1 text-xs leading-5 text-indigo-800">This page does not call OpenAI or store generated captions. Real provider mode will be enabled only after spending and security controls are reviewed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
