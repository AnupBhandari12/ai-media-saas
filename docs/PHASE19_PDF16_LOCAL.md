# AI Media — Phase 19, PDF-16: Unlock PDF (known password) — LOCAL worker only

**Roadmap basis:** AI Media Blueprint v2.0 Phase 19 / PDF-16. Builds on verified PDF-15 patch and existing Office conversion worker. Do not enable PDF-16 in the public Tools Hub yet. Do not change Neon, Prisma or Vercel settings for this local milestone.

## Change list: 7 files total

REPLACE exact files in project:
- `worker/cli.mjs`: import PDF unlock helper and handle `unlock` action before Office convert fallback.
- `worker/validation.mjs`: accept only `.pdf` for `unlock`, produce `-unlocked.pdf` output name.
- `worker/Dockerfile`: copies `pdfUnlock.mjs` into Docker worker.
- `tests/workerValidation.test.js`: one unlock validation test added while preserving existing cases.

ADD files:
- `worker/pdfUnlock.mjs`: bounded known-password read, safe qpdf stdin, encrypted input check, authenticated decrypt, result verification, cleanup.
- `tests/workerPdfUnlock.test.js`: password/path/argument unit tests.

Do not overwrite `worker/pdfProtection.mjs`, `compose.worker.yml`, Prisma schema, existing APIs, or `.env.local`.

## Usage: merge ZIP into `D:\ai-media`

From PowerShell, back up local modified files first (if any). Extract the ZIP with **-Force** after verifying `git status`:

```powershell
cd D:\ai-media
git status
Expand-Archive -Path "$HOME\Downloads\AI_Media_Phase19_PDF16_Local_Worker_Patch.zip" -DestinationPath "D:\ai-media" -Force
```

### QA step 1 — automated tests and build

```powershell
bun test
bun run lint
bun run build
```

You previously had 126 tests; this patch adds 6 cases (1 validation + 5 unlock helper tests), so expect **132 passes** if no other test changes. Bun tests alone do not verify real qpdf decryption.

### QA step 2 — Docker rebuild and health

```powershell
docker compose -f compose.worker.yml build document-worker
docker compose -f compose.worker.yml run --rm -T document-worker health
```

### QA step 3 — local PDF-16 end-to-end

Use only a PDF you own/have permission to decrypt and know the password for. The prior PDF-15 sample is ideal.

```powershell
New-Item -ItemType Directory -Force 'worker/local-files/input','worker/local-files/output' | Out-Null
Copy-Item 'worker/local-files/output/sample-protected.pdf' 'worker/local-files/input/sample-protected.pdf'
```

Do **not** change the file's password. Run the full PowerShell block, typing the password in the secure prompt:

```powershell
$secure = Read-Host 'Known PDF password' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  $plain | docker compose -f compose.worker.yml run --rm -T document-worker unlock sample-protected.pdf
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Variable plain, secure -ErrorAction SilentlyContinue
}
```

Expected output similar to:

```
{"status":"COMPLETED","operation":"UNLOCK_PDF","output":"sample-protected-unlocked.pdf","bytes":12345}
```

Inspect output:

```powershell
Invoke-Item '.\worker\local-files\output\sample-protected-unlocked.pdf'
```

Output should open without a password, with the expected text/page count/layout. Wrong passwords must fail and must not produce a valid output; avoid automatic repeated guesses. The current branch's PDF-15 test and Office-to-PDF smoke flow must remain working.

For structural check, copy the unlocked PDF to input (do not overwrite originals), then use the existing worker check action:

```powershell
Copy-Item 'worker/local-files/output/sample-protected-unlocked.pdf' 'worker/local-files/input/sample-protected-unlocked.pdf'
docker compose -f compose.worker.yml run --rm -T document-worker check sample-protected-unlocked.pdf
```

Remove local test PDFs when done. Never commit files in `worker/local-files/`.

### QA step 4 — commit and push as ONE milestone

```powershell
git status
git add -- worker/cli.mjs worker/validation.mjs worker/Dockerfile worker/pdfUnlock.mjs tests/workerValidation.test.js tests/workerPdfUnlock.test.js docs/PHASE19_PDF16_LOCAL.md
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "feat(worker): add Phase 19 PDF-16 known-password PDF unlock"
git push origin fix/phase19-audit
git status
```

**GitHub:** Your work is on `fix/phase19-audit`; the repo's `main` is still earlier. After QA and review, open a PR and merge explicitly, instead of assuming `git push` updates `main`.

## Intentional limitations / security

- Only trusted local Docker worker supports the new `unlock` action. No public API, upload/polling, hosted dispatcher, and no Tools Hub status change.
- Password is never placed in a CLI argument, database, or logs; `qpdf --password-file=-` reads from container STDIN. PowerShell and qpdf necessarily hold it temporarily in memory.
- This accepts known passwords only. There is no guessing, attack, or restriction bypass.
- Source must be an encrypted PDF that requires a password and is <=25 MiB. Output must be decryptable PDF, <=50 MiB, pass qpdf validation, and be unencrypted.
- PDFs with existing digital signatures may lose signature validity when rewritten; warn users before browser launch.
- A local-input/output sample may persist until explicitly deleted. `.gitignore` excludes `/worker/local-files/`.
- Phase 19's remaining requirements (reliable authenticated jobs, secure secret handoff, upload isolation, retention TTL/cleanup, tests, worker hosting) remain unfinished. Do not mark PDF-16 AVAILABLE publicly yet.

Reference: https://qpdf.readthedocs.io/en/11.3/cli.html (qpdf's `--password-file=-`, `--decrypt`, `--requires-password`, `--is-encrypted`).
