"use client";

import { useState } from "react";
const MAX_IMAGE_BYTES = 2_000_000;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function RealAltTextLab() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [requiresReview, setRequiresReview] = useState(false);

  function changeFile(event) {
    setFile(event.target.files?.[0] || null);
    setText(""); setError(""); setRequiresReview(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || requiresReview || !file) return;
    if (!IMAGE_TYPES.includes(file.type) || file.size < 64 || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a PNG, JPEG or WebP smaller than 2 MB."); return;
    }
    setBusy(true); setError(""); setText("");
    const body = new FormData();
    body.append("image", file);
    body.append("requestId", crypto.randomUUID());
    try {
      const response = await fetch("/api/ai/real/alt-text", {
        method: "POST", body, credentials: "same-origin", cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 409) setRequiresReview(true);
        throw new Error(payload.error || "AI Alt Text unavailable.");
      }
      if (typeof payload.text !== "string" || !payload.text.trim()) throw new Error("Invalid AI text.");
      setText(payload.text);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unknown outcome; do not retry.");
    } finally { setBusy(false); }
  }

  return <section aria-label="Real AI Alt Text controlled beta"
    className="mt-6 rounded-3xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-bold text-slate-900">Real AI Alt Text · controlled beta</h2>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Billable when enabled</span>
    </div>
    <p className="mt-2 text-sm text-slate-600">Unlike the local mock editor below, this uploads the selected image to OpenAI when your operator enables it. Maximum 2 MB, 4 MP, 4096px per side. Quota and server-side budget apply.</p>
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label htmlFor="real-alt-image" className="block text-sm font-semibold">Image for AI description</label>
      <input id="real-alt-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={changeFile}
        className="block w-full rounded-xl border border-slate-300 p-3 text-sm" />
      <button type="submit" disabled={busy || requiresReview || !file}
        className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Analyzing image..." : "Generate real AI Alt Text"}
      </button>
    </form>
    {error && <p className="mt-3 text-sm text-amber-800" role="alert">{error}</p>}
    {requiresReview && <p className="mt-2 text-xs text-amber-800">Outcome uncertain. Do not retry this image automatically; review server usage first.</p>}
    {text && <div className="mt-4 space-y-2">
      <label htmlFor="real-alt-output" className="block text-sm font-semibold">Editable AI description</label>
      <textarea id="real-alt-output" rows={4} value={text} onChange={event => setText(event.target.value)}
        className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
      <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        onClick={() => navigator.clipboard.writeText(text)}>Copy Alt Text</button>
    </div>}
  </section>;
}
