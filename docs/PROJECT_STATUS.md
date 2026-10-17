# AI Media — Build Status

Updated for Phase 19A start: 2026-10-17

## Verified pushed phases
- Phase 0–17: completed implementation milestones (functional QA required before launch).
- Phase 18A: AUD-01, AUD-02, AUD-03.
- Phase 18B: AUD-04, AUD-05, AUD-06.
- Last verified GitHub commit before Phase 19A: `eafd3adfd6edfbda35893805569149b8db739375`.

## Deferred by user — do not start automatically
- AUD-07 Speech to Text: timed transcription; TXT/SRT/JSON export.
- AUD-08 Transcript Summary / Notes: grounded summaries and action items.
- AI provider setup, key, quota, cost controls, and functional QA for those two tools.
- Resume only when user asks.

## Current milestone
**Phase 19A — Local document worker foundation.**

Local proof-of-concept only; not a production job-processing service.

1. Verify Docker worker health (LibreOffice, qpdf, Ghostscript).
2. Validate a local PDF using qpdf.
3. Convert sample DOCX/PPTX/XLSX into PDFs and visually check outputs.
4. Run Bun tests, ESLint and Next production build.
5. Commit after verification.

## Remaining milestones
- Phase 19B: Authenticated job API, queue, worker dispatch, isolation,
  temporary object storage, polling, output lifecycle, and quotas.
- Phase 19C+: PDF-12, PDF-15/16, PDF-20+ in separate functional batches.
- Phase 20: utilities and OCR.
- Phase 21: AI tools.
- Phase 22: ready-for workflows.
- Phase 23: AI Workspace.
- Phase 24: PWA, production setup, and launch.

## Rules
- Preserve working Next.js, Clerk, Prisma, Cloudinary, and staging flows.
- Never commit source files being tested in `worker/local-files/`.
- Do not mark future worker tools AVAILABLE before functional testing.
- Local worker cannot process requests from Next.js yet.
