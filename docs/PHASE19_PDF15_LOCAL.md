# Phase 19 — PDF-15 Local Protect PDF Worker (developer-only)

This patch is a LOCAL isolated Docker worker milestone for PDF-15. It is **not** a public API or web UI feature. It must not be marked AVAILABLE in `lib/tools/registry.js`. The existing Office worker and API remain unchanged. No Prisma migration and no Vercel environment changes.

## Exactly what this patch changes

Replace these existing files:
- `worker/validation.mjs` — supports `protect` plus current health/check/convert validation.
- `worker/cli.mjs` — implements password-protected PDF using `protectPdf` while keeping the original Office/check functions.
- `worker/Dockerfile` — COPY new `pdfProtection.mjs` into image.
- `compose.worker.yml` — tags the Compose image with the name used by the existing trusted Office runner.
- `tests/workerValidation.test.js` — preserves existing tests plus PDF protect validation.

Add these new files:
- `worker/pdfProtection.mjs` — PDF input validation, qpdf encryption (256-bit), anonymous response-file via stdin, verification.
- `tests/workerPdfProtection.test.js` — additional password/argument/input tests.
- `docs/PHASE19_PDF15_LOCAL.md` — this guide.

Do NOT copy `.env.local`, node_modules, generated Prisma files, or test documents into Git.

## 1 — Prepare

In PowerShell from `D:\ai-media`:

```powershell
git status
# Check local changes FIRST; back them up or commit if unrelated.
# Merge the ZIP contents into D:\ai-media (overwrite the 5 matching files listed above).
```

## 2 — Unit tests and lint/build

```powershell
bun test
bun run lint
bun run build
```

Expect 126 total Bun tests if your previous baseline had 122 (4 new tests).

## 3 — Build the local worker

```powershell
docker compose -f compose.worker.yml build document-worker
docker image inspect ai-media-document-worker:latest
```

Docker Desktop must be running. No need to change Neon or Cloudinary.

## 4 — Put ONE non-sensitive PDF in the ignored local input folder

```powershell
New-Item -ItemType Directory -Force 'worker/local-files/input','worker/local-files/output' | Out-Null
Copy-Item 'C:\path\to\a\nonsensitive\sample.pdf' 'worker/local-files/input/sample.pdf'
```

Replace the sample source path with an existing ordinary unencrypted PDF (max 25 MiB).

## 5 — Execute protection without typing the password in command history

**Run ALL of the following in a PowerShell terminal, not in a JavaScript file.**

```powershell
$secure = Read-Host 'New PDF password (12-64 printable ASCII chars, start with a letter/number)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $plain | docker compose -f compose.worker.yml run --rm -T document-worker protect sample.pdf
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Variable plain, secure -ErrorAction SilentlyContinue
}
```

Choose a unique strong password. Password is passed in STDIN, never argv or `DATABASE_URL`, and is not stored in Neon. It still exists briefly in local shell/container memory. Do not use real sensitive/customer documents in this pre-production test.

Expected output:

```
{"status":"COMPLETED","operation":"PROTECT_PDF","output":"sample-protected.pdf","bytes":12345}
```

The byte count will differ.

## 6 — Verify real output

Open `worker/local-files/output/sample-protected.pdf` in your PDF viewer. Without a password, it should prompt. Enter your password to open and inspect page contents. Do not mark PDF-15 complete based only on unit tests.

Clean up the local sample and output after testing:

```powershell
Remove-Item 'worker/local-files/input/sample.pdf','worker/local-files/output/sample-protected.pdf' -ErrorAction SilentlyContinue
```

## 7 — Confirm Git changes and push after tests and visual verification

```powershell
git status
git diff --check
git add worker/validation.mjs worker/cli.mjs worker/pdfProtection.mjs worker/Dockerfile compose.worker.yml tests/workerValidation.test.js tests/workerPdfProtection.test.js docs/PHASE19_PDF15_LOCAL.md
git diff --cached --stat
git commit -m "build Phase 19 PDF-15 local protected PDF worker"
git push origin main
```

Check that your current Git branch is `main` before using the last command (`git branch --show-current`). If you are on a feature branch, push that branch and merge through a PR instead. Do not run `git add .` and do not commit sample files or secrets.

## Release gate (not covered by this patch)

This patch does NOT implement secured browser upload/password handoff, queue dispatch for PDF-15, downloadable protected results via authenticated web API, retention cleanup, password-safe recovery, multi-user abuse controls, or hosted worker monitoring. Existing `scripts/worker/run-once.mjs` still handles only PDF-20/21/22 Office conversions. These must be designed/tested before enabling PDF-15 in Tools Hub or on Vercel. This step remains inside Blueprint v2 Phase 19.

## Security design notes

- qpdf 256-bit encryption; a strong randomly generated owner password distinct from the user password (not stored).
- User password limited to printable ASCII 12–64 chars, initial alphanumeric, no whitespace to support portable line-delimited `@-` input across qpdf versions.
- qpdf arguments come from stdin (`@-`) instead of process command-line argv, mitigating process-list exposure.
- PDF input must be an ordinary unencrypted PDF with a `%PDF-` header and pass qpdf's integrity check.
- Output is checked to require a password.
- `run` handles user-owned, non-sensitive developer samples only; no public endpoint uses the new action.
- Worker remains network-disabled, read-only (except mounted per local-files), restricted permissions.
- Local input/output are persisted in developer folder until removed manually; the ignore rule `/worker/local-files/` in `.gitignore` prevents accidental Git tracking.

References: https://qpdf.readthedocs.io/en/stable/cli.html (encryption, @- response files and --requires-password).
