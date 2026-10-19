"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ImagePlus, ImageOff, LockKeyhole, ShieldCheck, LoaderCircle,
  Sparkles, X, BadgeCheck, Info, Layers3, UploadCloud, ScanLine,
} from "lucide-react";
import LocalSolidBackgroundLab from "@/components/ai/LocalSolidBackgroundLab";
import { parseCaptionQuota } from "@/lib/ai/aiCaptionUi.mjs";
import {
  BACKGROUND_QUOTA_ENDPOINT, BACKGROUND_PROVIDER_READY,
  formatBackgroundBytes, inspectBackgroundImage, validateBackgroundImageDimensions,
} from "@/lib/ai/aiBackgroundUi.mjs";

function QuotaItem({ name, item }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{name} <span className="font-normal normal-case tracking-normal">· UTC</span></p>
      {item ? (
        <>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{item.remaining} <span className="text-xs font-medium text-slate-500">/ {item.limit} available</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${name} used quota`} aria-valuenow={Math.min(item.used, item.limit)} aria-valuemin={0} aria-valuemax={item.limit}>
            <div className="h-full bg-indigo-500" style={{ width: `${item.limit ? Math.min(100, (item.used / item.limit) * 100) : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-slate-500">{item.used} reserved slots · not charged by this page</p>
        </>
      ) : <p className="mt-2 text-sm text-slate-500">Unavailable</p>}
    </div>
  );
}

export default function BackgroundRemoverClient() {
  const [photo, setPhoto] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [dimensions, setDimensions] = useState(null);
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [quota, setQuota] = useState(null);
  const [quotaError, setQuotaError] = useState("");
  const [quotaLoading, setQuotaLoading] = useState(true);
  const objectUrlRef = useRef(null);
  const selectionVersionRef = useRef(0);
  const fileInputRef = useRef(null);

  useEffect(() => () => {
    selectionVersionRef.current += 1;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadQuota() {
      try {
        const response = await fetch(BACKGROUND_QUOTA_ENDPOINT, {
          credentials: "same-origin", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not read quota.");
        const parsed = parseCaptionQuota(await response.json());
        if (!controller.signal.aborted) setQuota(parsed);
      } catch {
        if (!controller.signal.aborted) setQuotaError("Quota unavailable. This page does not consume it.");
      } finally {
        if (!controller.signal.aborted) setQuotaLoading(false);
      }
    }
    void loadQuota();
    return () => controller.abort();
  }, []);

  function dropOldPreview() {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setPreviewUrl("");
    setPhoto(null);
    setDimensions(null);
  }

  function clearPhoto() {
    selectionVersionRef.current += 1;
    dropOldPreview();
    setFileError("");
    setReading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function acceptFile(file) {
    const thisSelection = ++selectionVersionRef.current;
    dropOldPreview();
    setFileError("");
    setReading(Boolean(file));
    if (!file) return;
    const checked = await inspectBackgroundImage(file);
    if (thisSelection !== selectionVersionRef.current) return;
    setReading(false);
    if (!checked.valid) {
      setFileError(checked.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPhoto(file);
    setPreviewUrl(url);
  }

  function onDrop(event) {
    event.preventDefault();
    setDragging(false);
    const chosen = event.dataTransfer?.files?.[0] || null;
    if (fileInputRef.current) fileInputRef.current.value = "";
    void acceptFile(chosen);
  }

  function onImageLoad(event) {
    const image = event.currentTarget;
    const checked = validateBackgroundImageDimensions(image.naturalWidth, image.naturalHeight);
    if (!checked.valid) {
      dropOldPreview();
      setFileError(checked.error);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setDimensions({ width: image.naturalWidth, height: image.naturalHeight });
  }

  function onImageError() {
    dropOldPreview();
    setFileError("Browser could not decode this image. Try another photo.");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-11">
      <div className="mx-auto max-w-6xl">
        <Link href="/tools" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to tools
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
              <LockKeyhole className="h-4 w-4" aria-hidden="true" /> Preparation only · No processing
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Background Remover</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Preview your source image locally. A free, browser-only editor below can clear connected solid-color backgrounds. <strong>Real AI background removal is still disabled.</strong></p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" /> No image uploads · $0 AI cost
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-7">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><UploadCloud className="h-5 w-5 text-indigo-600" aria-hidden="true" /> Your source image</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Local browser preview only; no network image upload or AI provider connection.</p>
            </div>
            <div className="space-y-5 p-5 sm:p-7">
              <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-9 ${dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><ImagePlus className="h-6 w-6" aria-hidden="true" /></div>
                <label htmlFor="background-source-file" className="mt-4 block text-sm font-bold text-slate-900">Choose a photo to inspect</label>
                <p className="mt-1 text-xs text-slate-500">Drag and drop or select from your device</p>
                <input ref={fileInputRef} id="background-source-file" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => { void acceptFile(event.target.files?.[0] || null); }}
                  className="mx-auto mt-4 block max-w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-3 file:py-2 file:font-semibold file:text-indigo-700" />
                <p className="mt-3 text-xs text-slate-500">PNG, JPG, WebP · Maximum 10 MB · 20 megapixels</p>
              </div>
              {reading && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="h-4 w-4 animate-spin" /> Checking image signature...</p>}
              {fileError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{fileError}</p>}
              {photo && (
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{photo.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatBackgroundBytes(photo.size)} · {photo.type}</p>
                    {dimensions && <p className="mt-1 text-xs text-slate-500">{dimensions.width} × {dimensions.height} pixels</p>}
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" /> Signature checked, original unchanged</span>
                  </div>
                  <button type="button" onClick={clearPhoto} className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-800">
                    <X className="h-4 w-4" /> Clear
                  </button>
                </div>
              )}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-6 text-indigo-950">
                <p className="flex items-center gap-2 font-bold"><Info className="h-4 w-4" /> Why no Remove button yet?</p>
                <p className="mt-1">We are preparing the safe file workflow first. Real background removal requires a separately reviewed image provider, authenticated upload, quota reservation, output storage and cost limits.</p>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:px-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Layers3 className="h-5 w-5 text-indigo-600" /> Image preview</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">ORIGINAL ONLY</span>
              </div>
              <div className="p-4 sm:p-6">
                <div className="relative flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 p-4 sm:min-h-80" style={{ backgroundColor: "#fff", backgroundImage: "linear-gradient(45deg,#e2e8f0 25%, transparent 25%), linear-gradient(-45deg,#e2e8f0 25%, transparent 25%), linear-gradient(45deg,transparent 75%,#e2e8f0 75%), linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)", backgroundSize: "24px 24px", backgroundPosition: "0 0,0 12px,12px -12px,-12px 0" }}>
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Your original unprocessed photo, shown only on this device" onLoad={onImageLoad} onError={onImageError} className="max-h-80 max-w-full rounded-lg object-contain" />
                  ) : (
                    <div className="py-12 text-center">
                      <ImageOff className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
                      <p className="mt-4 text-sm font-semibold text-slate-700">No image selected</p>
                      <p className="mt-1 text-xs text-slate-500">Upload a photo on the left to preview its original state.</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-xs font-semibold text-slate-700"><ScanLine className="h-4 w-4 text-indigo-600" /> Original · Not edited by AI</p>
                  <span className="text-xs font-semibold text-slate-500">AI “after” not available</span>
                </div>
                <button type="button" disabled aria-disabled="true" title="Background removal is not enabled in this commit" className="mt-5 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-500">
                  <Sparkles className="h-4 w-4" /> Remove background — not available yet
                </button>
                {!BACKGROUND_PROVIDER_READY && <p className="mt-2 text-center text-xs leading-5 text-slate-500">No provider, no generated result, no downloadable output, no charge.</p>}
              </div>
            </section>

            <section className="space-y-3" aria-label="AI action quota read only">
              <h2 className="text-sm font-bold text-slate-900">AI action quota <span className="font-normal text-slate-500">(read-only)</span></h2>
              {quotaLoading && <p role="status" className="text-xs text-slate-500">Loading quota...</p>}
              {quotaError && <p role="alert" className="text-xs text-amber-800">{quotaError}</p>}
              <div className="grid gap-3 sm:grid-cols-2"><QuotaItem name="Today" item={quota?.daily} /><QuotaItem name="This month" item={quota?.monthly} /></div>
              <p className="text-xs text-slate-500">This preparation page never reserves quota.</p>
            </section>
            <Link href="/tools/ai/alt-text-generator" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              Create an alt-text mock draft <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <LocalSolidBackgroundLab key={previewUrl || 'no-image'} file={photo} />
      </div>
    </main>
  );
}
