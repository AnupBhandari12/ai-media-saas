"use client";

import { useState } from "react";

import ToolShell from "@/components/tools/ToolShell";

import ProcessingModeBadge, {
  PROCESSING_MODES,
} from "@/components/tools/ProcessingModeBadge";

import PdfTextExtractorTool from "@/components/tools/pdf/PdfTextExtractorTool";
import PdfTextResult from "@/components/tools/pdf/PdfTextResult";

export default function PdfTextExtractorWorkspace() {
  const [output, setOutput] = useState(null);

  const resultContent = output ? (
    <PdfTextResult
      title="PDF text extracted"
      description="Selectable text was read directly from the PDF without OCR."
      output={output}
      metadata={[
        {
          label: "Pages",
          value: output.extractedPageCount,
        },
        {
          label: "Words",
          value: output.wordCount,
        },
        {
          label: "Characters",
          value: output.characterCount,
        },
      ]}
    />
  ) : null;

  return (
    <ToolShell
      toolId="PDF-19"
      title="PDF Text Extractor"
      description="Extract selectable text from PDF pages quickly without OCR."
      result={resultContent}
    >
      <ProcessingModeBadge mode={PROCESSING_MODES.LOCAL} />

      <div className="mt-6">
        <PdfTextExtractorTool onResultChange={setOutput} />
      </div>
    </ToolShell>
  );
}
