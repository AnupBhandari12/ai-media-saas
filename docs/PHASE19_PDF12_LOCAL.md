# AI Media Blueprint v2 — Phase 19 / PDF-12: Compress PDF to Target Size (LOCAL worker)

This milestone adds a bounded, **best-effort** target-size PDF compressor to the existing local Docker document worker. It is **not** a public web feature. PDF-15 (protect), PDF-16 (unlock), and PDF-20/21/22 (Office→PDF) remain intact. No Prisma, Neon, Vercel, storage, job API or registry changes.

## Exact patch: 7 files

REPLACE these existing files (based on pushed `fix/phase19-audit` PDF-16 commit `5277dec`):

- `worker/cli.mjs` — add `compress-target` dispatch after unlock.
- `worker/validation.mjs` — allow `.pdf` only and output `<name>-target.pdf`.
- `worker/Dockerfile` — COPY the new module into the existing container.
- `tests/workerValidation.test.js` — preserve prior checks and add PDF-12 validation test.

ADD these files:

- `worker/pdfTargetCompression.mjs` — Ghostscript passes at allowlisted DPI (170, 120, 85), qpdf validation, page-count guard, best-result selection and cleanup.
- `tests/workerPdfTargetCompression.test.js` — target/argument/candidate rules.
- `docs/PHASE19_PDF12_LOCAL.md` — this guide.

Do NOT replace `worker/pdfProtection.mjs`, `worker/pdfUnlock.mjs`, Office API, `compose.worker.yml`, `scripts/worker/run-once.mjs`, `.env.local`, or Prisma schema.

## 1. Install without losing local work

```powershell
cd D:\ai-media
git status
# If you have uncommitted changes to files being replaced, back them up or commit first.
Expand-Archive -Path "$HOME\Downloads\AI_Media_Phase19_PDF12_Local_Worker_Patch.zip" -DestinationPath 'D:\ai-media' -Force
```

## 2. Run automated checks BEFORE pushing

```powershell
bun test
bun run lint
bun run build
```

Expected **139 passed, 0 failed** if your PDF-16 state had 132 tests and no other tests changed. Unit tests do not by themselves prove Ghostscript quality, page preservation, or safety for all PDFs.

## 3. Docker rebuild and health

```powershell
docker compose -f compose.worker.yml build document-worker
docker compose -f compose.worker.yml run --rm -T document-worker health
```

Expected document worker ready (LibreOffice, qpdf, Ghostscript).

## 4. Test with an ORDINARY unencrypted PDF that you own

```powershell
New-Item -ItemType Directory -Force 'worker/local-files/input','worker/local-files/output' | Out-Null
```

Place a non-sensitive **unencrypted** PDF of 1–5 MiB in `D:\ai-media\worker\local-files\input\sample.pdf`. For example, copy a document you own or your existing unencrypted local test PDF; **do not** use `sample-protected.pdf` (PDF-15 creates encrypted files). Max input 25 MiB.

Try a realistic example target of 1500 KiB (1.46 MiB):

```powershell
docker compose -f compose.worker.yml run --rm -T document-worker compress-target sample.pdf 1500
```

Then try 500 KiB to see what happens when a target is hard to reach:

```powershell
docker compose -f compose.worker.yml run --rm -T document-worker compress-target sample.pdf 500
```

The new output is always `worker/local-files/output/sample-target.pdf` (the second command overwrites the first), so **inspect or copy the first result before running the second command**.

Example JSON (bytes and targetMet vary by file):

```json
{
  "status":"COMPLETED",
  "operation":"COMPRESS_PDF_TO_TARGET",
  "output":"sample-target.pdf",
  "originalBytes":4200000,
  "bytes":1200000,
  "targetKiB":1500,
  "targetBytes":1536000,
  "targetMet":true,
  "savedBytes":3000000,
  "pages":3,
  "qualityDpi":170
}
```

Open the result:

```powershell
Invoke-Item '.\worker\local-files\output\sample-target.pdf'
```

Verify page count, readability, image quality, layout and file size manually against the original. For sample PDFs that are mostly text/vector, Ghostscript might not reduce the size; `targetMet:false` is a **valid and honest result**, not necessarily a worker failure. For inputs already within the target, the worker publishes a checked copy without re-encoding (`qualityDpi:null`).

## 5. One commit for this PDF-12 milestone

Only after QA passes:

```powershell
git status
git add -- worker/cli.mjs worker/validation.mjs worker/Dockerfile worker/pdfTargetCompression.mjs tests/workerValidation.test.js tests/workerPdfTargetCompression.test.js docs/PHASE19_PDF12_LOCAL.md
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "feat(worker): add Phase 19 PDF-12 target PDF compression"
git push origin fix/phase19-audit
git status
```

The branch is `fix/phase19-audit`; `main` stays unchanged until PR review/merge.

## Limits and decisions

- Accepts `compress-target <filename.pdf> <target-KiB>`; target 50–25600 **KiB**, 1 KiB = 1024 bytes. Input max 25 MiB.
- Uses only three reviewed Ghostscript downsampling profiles; shells are never invoked and users cannot pass command switches.
- Rejects encrypted PDFs; user can separately run PDF-16 on a file they are authorized to unlock.
- Rejects malformed inputs, verifies PDF signature, qpdf integrity and unchanged positive page count for each candidate.
- May alter image quality and editable forms, annotations, metadata, accessibility structure and invalidate digital signatures. **Never use real signed, legal, medical or other important documents in this early development test.** Visual QA is essential.
- Keeps only the smallest *validated* candidate, including original; does not deliberately make files larger.
- Returns `targetMet: true/false`, exact original/output bytes and savedBytes. **No false claims that requested target has been met.**
- Temporary intermediate attempts are removed after run; the final downloaded-style output remains in the ignored local folder until manually removed.
- This is developer-only. No automatic queue, authenticated browser upload/download, temporary-cloud retention or hosted worker management yet. Do not mark PDF-12 AVAILABLE in Tools Hub.

References: AI Media Blueprint v2.0 PDF-12 and Phase 19; Ghostscript pdfwrite docs https://ghostscript.readthedocs.io/en/latest/VectorDevices.html and Ghostscript's explanation https://ghostscript.com/blog/optimizing-pdfs.html.
