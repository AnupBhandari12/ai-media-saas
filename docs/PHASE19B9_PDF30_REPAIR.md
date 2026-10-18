# AI Media Blueprint v2.0 — Phase 19B9 / PDF-30 Repair / Normalize (FREE LOCAL)

**Based on the exact GitHub branch** `fix/phase19-audit` at commit `b6d35bd` (Phase 19B7). No Neon/Prisma changes, no B2 bucket policy changes, no paid services, no registry `AVAILABLE` changes, no hosted deployment. This milestone is NOT a general file recovery guarantee.

## Files in this ZIP

**REPLACE ONLY these previously reviewed existing files:**

1. `worker/cli.mjs` — adds one allowlisted `repair` action, retaining existing operations.
2. `worker/validation.mjs` — validates `.pdf` and names `*-normalized.pdf`.
3. `worker/Dockerfile` — copies new repair module into the worker image.
4. `tests/workerValidation.test.js` — adds one validation test.
5. `lib/worker/localPdfDevRules.mjs` — adds `repair` operation (no password).
6. `lib/worker/localPdfDevUiConfig.js` — adds PDF-30 development UI settings.
7. `scripts/worker/local-pdf-bridge.mjs` — accepts only a verified repair result, exposes method/integrity metadata; retains token/origin safeguards.
8. `components/tools/pdf/LocalPdfDevWorkspace.jsx` — adds repair selection and warning; preserves prior three tools.
9. `tests/tools/localPdfDevBridge.test.js` — adds repair-specific allowlist test while preserving old tests.

**ADD ONLY these three new files:**

10. `worker/pdfRepair.mjs` — best-effort qpdf normalize, fallback Ghostscript, output validation and cleanup.
11. `tests/workerPdfRepair.test.js` — six pure safety tests.
12. `app/(dashboard)/tools/pdf/repair-worker/page.js` — local development route only.

And this `docs/PHASE19B9_PDF30_REPAIR.md` guide (13th file).

Do NOT overwrite `run-once.mjs`, `run-auto.mjs`, any Office conversion code or APIs, `prisma/schema.prisma`, `.env.local`, `compose.worker.yml`, registry, or other PDF modules.

## 1. Confirm current branch and clean tree

```powershell
cd D:\ai-media
git branch --show-current
git status
```

Branch must be `fix/phase19-audit`. No unrelated uncommitted source changes before extraction. This ZIP includes full replacement versions of the nine files *at the checked commit*. If your local source differs, stop and ask for a revised patch rather than overwriting.

## 2. Extract

```powershell
Expand-Archive -Path "$HOME\Downloads\AI_Media_Phase19B9_PDF30_Local_Repair_Patch.zip" -DestinationPath 'D:\ai-media' -Force
```

Before running build, review exactly which files changed:

```powershell
git --no-pager diff --stat
git --no-pager diff --check
git status
```

## 3. Tests and Docker image build

```powershell
bun test
bun run lint
bun run build
docker compose -f compose.worker.yml build document-worker
docker compose -f compose.worker.yml run --rm -T document-worker health
```

If 169 existing Bun cases were present, **177 total tests expected** (six new repair tests + one worker validation + one bridge allowlist test). The actual Bun output is authoritative. Lint, build and Docker health must pass before proceeding.

## 4. First test — normal PDF (normalization)

Use a disposable PDF you own, with no password, under 25 MiB. Do not use signed, legal, medical or confidential documents in this phase.

```powershell
New-Item -ItemType Directory -Force 'worker/local-files/input','worker/local-files/output' | Out-Null
Copy-Item 'C:\path\to\your\normal.pdf' 'worker/local-files/input/sample.pdf'
docker compose -f compose.worker.yml run --rm -T document-worker repair sample.pdf
Invoke-Item '.\worker\local-files\output\sample-normalized.pdf'
```

Replace `C:\path\to\your\normal.pdf` with a real local file you own. Expected success is JSON with `status: COMPLETED`, `operation: REPAIR_NORMALIZE_PDF`, `method` = `qpdf` (typically) or `ghostscript`, output `sample-normalized.pdf`, page count and actual bytes.

Open the original and result side by side and compare all pages, fonts, links, text and forms. Source is never overwritten.

## 5. Second test — browser local PDF-30

Terminal 1:

```powershell
bun run dev
```

Terminal 2:

```powershell
node --env-file=.env.local scripts/worker/local-pdf-bridge.mjs
```

Visit `http://localhost:3000/tools/pdf/repair-worker`, paste the newly printed local bridge token **only on that page**, select the same disposable PDF and click **Repair / Normalize PDF**. Download and compare. No password field exists for PDF-30. Test PDF-12, PDF-15, PDF-16 again to confirm no regression.

If corrupted input is tested, use only a disposable test fixture and acknowledge it may be irrecoverable. Invalid PDF bytes should fail with a generic error; output must never be claimed to be repaired when it fails integrity and page-count checks. Real damaged PDFs are unpredictable, and a successful rewrite does not guarantee every visual element or metadata survived.

## 6. Safety rules

- This tool rewrites PDF structure. It may invalidate digital signatures and alter interactive forms, annotations, accessibility tags, hyperlinks or metadata.
- When the original page count is readable, the output page count **must match**. When it is not readable, only the recovered positive page count can be checked; visual human review is mandatory.
- Encrypted PDFs are rejected when recognized. The known-password PDF-16 tool is separate.
- Fixed qpdf and Ghostscript switches only, `shell:false`, isolated offline per-job Docker volume; no user-specified commands, paths, or options.
- Max input 25 MiB; max output 50 MiB; 90-second command timeout. Output must have `%PDF-` header, pass qpdf integrity check, not be encrypted and have at least one page.
- Returns generic failures to the browser without leaking file contents or PDF parser stderr.
- Private local temp folders are cleaned in `finally` but machine shutdown may leave orphans. No payment, hosted worker or production flag changes.
- No guarantee a severely broken PDF can be restored. `sourceIntegrityPassed:false` means original had structural validation warnings/errors, not proof that output is lossless.
- Do not enable PDF-30 in public Tools Hub until production worker infrastructure and security reviews are complete.

## 7. One reviewed commit/push after real QA

```powershell
git add -- worker/cli.mjs worker/validation.mjs worker/Dockerfile worker/pdfRepair.mjs tests/workerValidation.test.js tests/workerPdfRepair.test.js lib/worker/localPdfDevRules.mjs lib/worker/localPdfDevUiConfig.js scripts/worker/local-pdf-bridge.mjs components/tools/pdf/LocalPdfDevWorkspace.jsx tests/tools/localPdfDevBridge.test.js 'app/(dashboard)/tools/pdf/repair-worker/page.js' docs/PHASE19B9_PDF30_REPAIR.md

git --no-pager diff --cached --stat
git --no-pager diff --cached --check

git commit -m "feat(worker): add Phase 19 PDF-30 safe repair and local browser QA"
git push origin fix/phase19-audit
git status
```

## Phase 19 completion status

Still required for final Free/Local signoff: read-only security audit, uploaded-vs-result cross-user access rejection, verified B2 expiry dry-run and optional approved cleanup, disabled-worker regression, mobile/Office/PDF visual checks, safe artifact lifecycle. Cloud-hosted worker, production-grade job leases, continuous retry, malware scanning and live paid infrastructure are deferred to the final-launch production gate per project decision. Local milestones alone must never be labeled production-ready.
