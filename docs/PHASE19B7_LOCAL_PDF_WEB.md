# AI Media Blueprint v2 — Phase 19B7 / Local PDF-12, PDF-15, PDF-16 Browser QA

**Important:** This patch is a single-PC, development-only bridge. It deliberately changes NO existing project files. It adds a local HTTP bridge that binds **127.0.0.1:4847**, accepts only an exact local dev origin and a per-start random token, streams PDFs into the existing offline Docker worker, and returns the result to the local browser. No Neon/Prisma/B2 write, no Vercel settings, no registry AVAILABLE flags, no paid hosting. It does not replace the actual secure hosted-worker design required before public release.

## Change list — 9 additive files

- `lib/worker/localPdfDevRules.mjs` — strict loopback/origin/token/operation/PDF streaming helpers.
- `lib/worker/localPdfDevUiConfig.js` — safe UI configuration for PDF-12/15/16.
- `scripts/worker/local-pdf-bridge.mjs` — opt-in local HTTP bridge and offline Docker execution.
- `components/tools/pdf/LocalPdfDevWorkspace.jsx` — responsive browser QA UI.
- `app/(dashboard)/tools/pdf/compress-target-worker/page.js` — PDF-12 dev page.
- `app/(dashboard)/tools/pdf/protect-worker/page.js` — PDF-15 dev page.
- `app/(dashboard)/tools/pdf/unlock-worker/page.js` — PDF-16 dev page.
- `tests/tools/localPdfDevBridge.test.js` — helper/security/streaming rules.
- `docs/PHASE19B7_LOCAL_PDF_WEB.md` — this guide.

This patch does not modify `worker/cli.mjs`, any Prisma file, existing Office UI/API, existing tests, `lib/tools/registry.js` or the public Tools Hub. This patch was based on `fix/phase19-audit` at `bc9c10d`.

## 1. Merge files

From the project root in PowerShell:

```powershell
cd D:\ai-media
git status
# Resolve or back up unrelated changes before extracting.
Expand-Archive -Path "$HOME\Downloads\AI_Media_Phase19B7_Local_PDF_Web_Patch.zip" -DestinationPath 'D:\ai-media' -Force
```

No existing files should be overwritten; check `git status` and do not run `git add .`.

## 2. Local flags

Only in `.env.local` add:

```env
LOCAL_PDF_DEV_BRIDGE_ENABLED=true
# Only if you explicitly open Next.js at http://127.0.0.1:3000:
# LOCAL_PDF_DEV_ORIGIN=http://127.0.0.1:3000
```

The default origin is **http://localhost:3000**. Never add these flags to Vercel, expose the bridge via tunnel, or run with public PDFs.

## 3. Bun tests, lint, and build

```powershell
bun test
bun run lint
bun run build
```

If the last baseline was 159 Bun tests, 10 tests added here means **169 tests expected**, but the actual runner is authoritative. Build should not enable these dev routes on production: each page returns `notFound()` outside `NODE_ENV=development`.

## 4. Start three terminals (one bridge instance only)

Ensure Docker Desktop is running and the previously tested `ai-media-document-worker:latest` image is available.

**Terminal A — website**:

```powershell
bun run dev
```

**Terminal B — localhost PDF bridge**:

```powershell
node --env-file=.env.local scripts/worker/local-pdf-bridge.mjs
```

The bridge prints an ephemeral 64-hex-character token. **Do not send, screenshot, commit, or paste that token into chats.** Paste it only in the local browser UI. The token changes on restart and is held only in page memory. Do not mistake it for a Clerk user ID.

**Terminal C — optional existing Office worker (only if also QA-testing Word/PPT/Excel)**:

```powershell
bun --env-file=.env.local scripts/worker/run-auto.mjs
```

The Office worker is a separate, existing process; local PDF bridge doesn't require it.

## 5. Test three dev-only pages

- PDF-12: `http://localhost:3000/tools/pdf/compress-target-worker`
- PDF-15: `http://localhost:3000/tools/pdf/protect-worker`
- PDF-16: `http://localhost:3000/tools/pdf/unlock-worker`

Choose only your OWN non-sensitive PDF under 25 MiB. On PDF-12 enter a target in KiB and confirm true/false target, actual size, page count, and readable output. On PDF-15 enter a strong unique ASCII password and verify the downloaded PDF **requires** it. On PDF-16 upload the protected test PDF, enter the known password, and verify the output opens without password and preserves pages. Test wrong password once: it should fail without giving a downloadable PDF. Do not run password guessing.

Each request opens an isolated Docker container with no network, no shell, 1 GiB memory, 1 CPU, no privileges, and a per-request mounted input/output workspace. The bridge processes one file at a time and uses streamed uploads (file bytes are not fully buffered into Next.js). Temporary local workspaces are removed after request completion. Aborted or forcibly terminated processes may still require manual inspection/cleanup of `worker/local-files/`.

Passwords are not sent in URLs, headers, argv, logs, Neon, or B2. They are sent to the local bridge in a small binary prefix over localhost HTTP and then to qpdf/Docker stdin. They still exist temporarily in browser/host/container memory; this is NOT a hardened production secret-handling system. File bytes also travel over loopback HTTP — never open this service to a network or third-party clients.

**Known limits:** If Docker or qpdf fails, browser receives a generic error. Protect/unlock of digitally signed PDFs may invalidate signatures, and Ghostscript PDF compression can damage forms/annotations/accessibility; test only disposable files. PDF-12 does not guarantee exact target. The UI is temporary development UX, NOT production-ready.

## 6. Regression test existing Office tools

With existing owner-scoped worker flags enabled and `WORKER_DEV_OWNER_ID` pointing at your own Clerk test user, sign in at `http://localhost:3000` and upload a small, non-sensitive DOCX at `/tools/pdf/word-to-pdf`. Keep `run-auto.mjs` running. Confirm verified upload → auto-processing → private PDF download. Repeat with PPTX and XLSX. Compare formatting/page count and test unauthorized users. The existing Office UI still contains a stale *manual runner* instruction when waiting; this patch intentionally leaves it untouched. Fix that message in a later audited, explicit existing-file change.

## 7. Commit one batch only after live QA passes

```powershell
git status
git add -- lib/worker/localPdfDevRules.mjs lib/worker/localPdfDevUiConfig.js scripts/worker/local-pdf-bridge.mjs components/tools/pdf/LocalPdfDevWorkspace.jsx 'app/(dashboard)/tools/pdf/compress-target-worker/page.js' 'app/(dashboard)/tools/pdf/protect-worker/page.js' 'app/(dashboard)/tools/pdf/unlock-worker/page.js' tests/tools/localPdfDevBridge.test.js docs/PHASE19B7_LOCAL_PDF_WEB.md
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "feat(worker): add free localhost PDF web QA bridge"
git push origin fix/phase19-audit
git status
```

## Release status and later Phase 19 work

- Do NOT set PDF-12/15/16 or PDF-20/21/22 to `AVAILABLE` yet.
- These three browser QA routes intentionally 404 in production builds.
- **NOT addressed here**: hosted 24/7 worker, production secure upload/secret handoff, durable leases and idempotent retries, storage/version lifecycle, malware scanning, rate limits, strict quotas, production observability, cross-account penetration tests, full Phase 19 release criteria and `main` merge. Free/local testing can continue without card; infrastructure-dependent work remains deferred until final launch.
