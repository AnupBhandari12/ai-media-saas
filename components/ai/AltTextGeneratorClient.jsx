"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Check, ClipboardCopy, Eye, FlaskConical,
  ImagePlus, LoaderCircle, ShieldCheck, Sparkles, X,
} from "lucide-react";

import LocalAltTextReviewLab from "@/components/ai/LocalAltTextReviewLab";
import RealAltTextLab from "@/components/ai/RealAltTextLab";

import {
  ALT_TEXT_EXAMPLES,
  ALT_TEXT_MAX_LENGTH,
  ALT_TEXT_PREVIEW_ENDPOINT,
  ALT_TEXT_QUOTA_ENDPOINT,
  altTextPreviewError,
  createAltTextPreviewBody,
  parseLocalAltTextPreview,
  validateAltTextDescription,
  validateLocalAltTextImage,
} from "@/lib/ai/aiAltTextUi.mjs";
import { parseCaptionQuota } from "@/lib/ai/aiCaptionUi.mjs";

function QuotaBox({ title, item }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        <span className="text-xs text-slate-500">UTC</span>
      </div>
      {item ? (
        <>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {item.remaining} <span className="text-xs font-normal text-slate-500">remaining / {item.limit}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar"
            aria-label={`${title} usage`} aria-valuenow={Math.min(item.used, item.limit)}
            aria-valuemin={0} aria-valuemax={item.limit}>
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${item.limit ? Math.min(100, (item.used / item.limit) * 100) : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{item.used} reserved slots</p>
        </>
      ) : <p className="mt-3 text-sm text-slate-500">Unavailable</p>}
    </div>
  );
}

export default function AltTextGeneratorClient() {
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState("");
  const [quota, setQuota] = useState(null);
  const [quotaError, setQuotaError] = useState("");
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [hasPreview, setHasPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const controllerRef = useRef(null);
  const objectUrlRef = useRef(null);
  const valid = useMemo(() => validateAltTextDescription(description), [description]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadQuota() {
      try {
        const res = await fetch(ALT_TEXT_QUOTA_ENDPOINT, {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        if (!res.ok) throw new Error("Quota request failed.");
        const data = parseCaptionQuota(await res.json());
        if (!controller.signal.aborted) setQuota(data);
      } catch {
        if (!controller.signal.aborted) setQuotaError("Quota is unavailable. Mock previews still do not consume quota.");
      } finally {
        if (!controller.signal.aborted) setQuotaLoading(false);
      }
    }
    void loadQuota();
    return () => controller.abort();
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function resetResult() {
    controllerRef.current?.abort();
    setBusy(false);
    setHasPreview(false);
    setDraft("");
    setError("");
    setCopied(false);
  }

  function clearImage() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImageUrl("");
    setImageFile(null);
  }

  function onSelectFile(event) {
    const file = event.target.files?.[0] || null;
    resetResult();
    clearImage();
    if (!file) {
      setImageError("");
      return;
    }
    const checked = validateLocalAltTextImage(file);
    if (!checked.valid) {
      setImageError(checked.error);
      event.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageFile(file);
    setImageUrl(url);
    setImageError("");
  }

  async function onGenerate(event) {
    event.preventDefault();
    if (!valid.valid || busy) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError("");
    setHasPreview(false);
    setDraft("");
    setCopied(false);
    try {
      const response = await fetch(ALT_TEXT_PREVIEW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify(createAltTextPreviewBody(description)),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (!response.ok) throw new Error(altTextPreviewError(response.status));
      const result = parseLocalAltTextPreview(await response.json());
      if (controller.signal.aborted) return;
      setDraft(result.text);
      setHasPreview(true);
      setQuota(result.quota);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : "Unable to create mock preview.");
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Clipboard is unavailable; select and copy the text manually.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/tools" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tools
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> Local mock + Real AI beta
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Alt Text Generator</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Make an editable accessibility-description draft from <strong>your own words</strong>.
              You can preview an image locally, but this tool does <strong>not</strong> inspect or upload the image.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Mock section stays free
          </div>
        </div>

        <RealAltTextLab />
        <LocalAltTextReviewLab />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ImagePlus className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Prepare your description
              </h2>
              <p className="mt-1 text-xs text-slate-500">The image preview stays in your browser. Only the typed description is sent to the mock endpoint.</p>
            </div>
            <form onSubmit={onGenerate} className="space-y-6 px-5 py-6 sm:px-7">
              <div>
                <label htmlFor="alt-image" className="block text-sm font-semibold text-slate-800">Image for local preview (optional)</label>
                <input id="alt-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={onSelectFile}
                  className="mt-2 block w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-semibold file:text-indigo-700" />
                <p className="mt-2 text-xs text-slate-500">PNG / JPEG / WebP, up to 10 MB. Not uploaded or analyzed.</p>
                {imageError && <p role="alert" className="mt-2 text-xs text-red-700">{imageError}</p>}
                {imageUrl && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="User-selected image shown only in this browser" className="mx-auto max-h-60 w-full rounded-xl object-contain" />
                    <p className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">{imageFile?.name}</span>
                      <button type="button" onClick={() => { clearImage(); resetResult(); }} className="inline-flex shrink-0 items-center gap-1 text-slate-600 hover:text-rose-700">
                        <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
                      </button>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="alt-description" className="block text-sm font-semibold text-slate-800">Describe what is visibly present</label>
                <textarea id="alt-description" rows={6} value={description} maxLength={ALT_TEXT_MAX_LENGTH + 50}
                  onChange={(event) => { resetResult(); setDescription(event.target.value); }}
                  placeholder="Example: A blue ceramic cup on a wooden kitchen table next to a small green plant."
                  className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
                  <span className={!description || valid.valid ? "text-slate-500" : "text-amber-700"}>
                    {description ? (valid.valid ? "Ready for a local mock preview" : valid.error) : "Describe objects, colors, locations and actions; avoid guesses about identity."}
                  </span>
                  <span className="text-slate-500">{description.length}/{ALT_TEXT_MAX_LENGTH}</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Try a description</p>
                <div className="flex flex-wrap gap-2">
                  {ALT_TEXT_EXAMPLES.map((example) => (
                    <button type="button" key={example.label} onClick={() => { resetResult(); setDescription(example.text); }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50">
                      {example.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={!valid.valid || busy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {busy ? "Preparing draft..." : "Create mock alt text"}
              </button>
              {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
              <p className="text-xs leading-5 text-slate-500">This is a placeholder from your text, not generated image recognition. Review and edit before publishing.</p>
            </form>
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Eye className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Alt text draft</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">NOT AI GENERATED</span>
              </div>
              {hasPreview ? (
                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold text-amber-800">MOCK ONLY • Your description • Image not analyzed</p>
                  <label htmlFor="alt-draft" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Review and edit this draft</label>
                  <textarea id="alt-draft" rows={6} maxLength={2000} value={draft}
                    onChange={(event) => { setDraft(event.target.value); setCopied(false); }}
                    className="w-full resize-y rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm leading-6 text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
                  <button type="button" onClick={copyDraft} disabled={!draft.trim()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <ClipboardCopy className="h-4 w-4" aria-hidden="true" />}
                    {copied ? "Copied" : "Copy draft"}
                  </button>
                </div>
              ) : (
                <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-center">
                  <FlaskConical className="h-8 w-8 text-indigo-400" aria-hidden="true" />
                  <p className="mt-4 text-sm font-semibold text-slate-800">No mock draft yet</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Enter a visual description on the left, then create a local-only placeholder.</p>
                </div>
              )}
            </section>

            <section aria-label="AI quota" className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">AI action quota <span className="font-normal text-slate-500">(read-only)</span></h2>
              {quotaLoading && <p role="status" className="text-xs text-slate-500">Loading quota...</p>}
              {quotaError && <p role="alert" className="text-xs text-amber-800">{quotaError}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <QuotaBox title="Today" item={quota?.daily} />
                <QuotaBox title="This month" item={quota?.monthly} />
              </div>
              {quota && !quota.allowed && <p className="text-xs text-amber-800">Your paid AI quota is exhausted. Mock previews still do not use quota.</p>}
            </section>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-6 text-indigo-950">
              <p className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Browser-only image preview</p>
              <p className="mt-1">In this local mock section only, no image bytes are transmitted. The server receives only the description you type. The Real AI beta above is a separate billable workflow.</p>
              <p className="mt-2">A real vision-based alt text feature will require separate image upload security, provider cost controls and explicit enablement.</p>
            </div>
            <Link href="/tools/ai/caption-generator" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              Try Caption Generator <Sparkles className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
