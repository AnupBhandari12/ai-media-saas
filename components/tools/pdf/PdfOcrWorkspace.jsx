"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import PdfOcrTool from "@/components/tools/pdf/PdfOcrTool";
import PdfTextResult from "@/components/tools/pdf/PdfTextResult";

export default function PdfOcrWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <PdfTextResult
      title="OCR complete"
      description="Text was recognized from rendered scanned PDF pages."
      output={output}
      metadata={[
        {
          label: "Pages",
          value: output.processedPageCount,
        },
        {
          label: "Language",
          value: output.languageLabel,
        },
        {
          label: "Words",
          value: output.wordCount,
        },
        {
          label: "Confidence",
          value:
            output.averageConfidence === null
              ? "—"
              : `${output.averageConfidence}%`,
        },
      ]}
    />
  ) : null;

  return (
    <ToolShell
      toolId="PDF-18"
      title="PDF OCR to Text"
      description="Extract text from scanned PDF pages using browser-based OCR."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <PdfOcrTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
