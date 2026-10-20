# Phase 22 — Stage 11 — WF-10 Student Notes Pack

## Blueprint and boundaries

The blueprint's WF-10 eventually supports lecture audio/PDF → transcript/text → notes linked to source locations (E7/E8). This stage delivers the deterministic PDF photo branch in the Phase-22 declarative registry (`PDF-17` Scan Photos to PDF → `PDF-13` Add Page Numbers). It is **not** AI note generation, OCR or audio processing.

## Included photo beta

- Up to 15 JPG/PNG/WebP source photos, max 10 MB each and 50 MB total.
- Manual ordering, removal and page number start; A4/FIT and enhance/grayscale/original modes.
- Local scanned PDF creation via existing `createScannedPdfFromImages` engine, then number via existing `addPdfPageNumbers` engine.
- A numbered PDF (max 30 MB) and separate UTF-8 TXT source index mapping each output sheet and number to the original photo filename.
- Trace for each completed processing step, cancellation at safe boundaries, no cloud upload or provider keys.
- Download and open PDF for quality review; errors fail closed without partial output.

## Out of scope / limitations

- PDF is image-based; no OCR or selectable text generated. External `PDF-18` OCR tool remains separately available, but scan variant inside the workflow is preview-only.
- Lecture audio, transcription, summarization, structured notes, timestamps, citations to OCR text, AI credit metering, PDF+index bundling as ZIP are **not shipped** in this beta.
- Language-model summarization must not be claimed without source-grounded reference mapping and explicit approvals.
- Cancellation cannot interrupt a single synchronous PDF rendering operation; abort stops between approved steps and suppresses final download.

## QA

1. `node scripts/phase22/add-stage11-student-notes-link.mjs`
2. `bun test tests/workflows/phase22Stage11.test.js`
3. `bun test`
4. `bun run lint`
5. `bun run build`
6. Manual QA: `/workflows/student-notes-pack`, including ordering, PDF pages, source TXT, mobile view, existing workflow links.
7. Inspect `git diff --check`, review exactly 9 expected changed files, then stage and commit.

No new npm/bun packages, migrations or `.env` keys are needed.
