"use client";

import { Check, Copy } from "lucide-react";

import { useState } from "react";

import ResultPanel from "@/components/tools/ResultPanel";
import DownloadGroup from "@/components/tools/DownloadGroup";

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);

    return;
  }

  const textarea = document.createElement("textarea");

  textarea.value = text;

  textarea.style.position = "fixed";

  textarea.style.opacity = "0";

  document.body.appendChild(textarea);

  textarea.select();

  document.execCommand("copy");

  textarea.remove();
}

export default function PdfTextResult({
  title,
  description,
  output,
  metadata,
}) {
  const [copied, setCopied] = useState(false);

  if (!output) {
    return null;
  }

  async function handleCopy() {
    await copyText(output.text);

    setCopied(true);

    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <ResultPanel title={title} description={description} metadata={metadata}>
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-foreground">Extracted text</p>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground"
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}

              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <pre className="mt-4 max-h-520px overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-slate-50 p-4 font-sans text-sm leading-7 text-foreground">
            {output.text}
          </pre>
        </div>
      </ResultPanel>

      <DownloadGroup
        downloads={[
          {
            name: output.filename,

            filename: output.filename,

            url: output.textUrl,
          },
        ]}
      />
    </div>
  );
}
