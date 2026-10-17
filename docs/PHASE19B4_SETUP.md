# Phase 19B4 — Office to PDF UI (local-dev build)

**GitHub base:** `bb664b5` (Phase 19B3). Add the files in this starter ZIP without replacing B1/B2/B3 APIs, Prisma schema, or worker image. B3 manual runner remains necessary.

## New files (7)

- `lib/worker/officeUiConfig.js` — browser-safe input rules and status messages
- `components/tools/pdf/OfficeToPdfWorkspace.jsx` — shared responsive file picker, upload, status polling, cancellation, private download
- `app/(dashboard)/tools/pdf/word-to-pdf/page.js` — PDF-20
- `app/(dashboard)/tools/pdf/powerpoint-to-pdf/page.js` — PDF-21
- `app/(dashboard)/tools/pdf/excel-to-pdf/page.js` — PDF-22
- `tests/tools/officeWorkerUi.test.js` — rule tests
- `docs/PHASE19B4_SETUP.md` — this guide

## Intentional limitations

- This is an authenticated **development-only** UI. Do not enable worker flags in Vercel or announce a generally available conversion service.
- `lib/tools/registry.js` is deliberately unchanged (67 entries). PDF-20/21/22 have NOT been marked AVAILABLE or added to the Tools Hub. Test by typing the routes manually.
- **Do not process sensitive or other people's documents.** There is no malware scanner or hosted auto-dispatch yet.
- Private Backblaze bucket, CORS `s3_put` + `Content-Type`, and three local env flags must already be configured.
- The browser cannot start Docker on the user's machine; after upload verification, run the trusted local command in a *separate PowerShell*.
- The API polls every 5 seconds only while waiting; leaving the page is safe. Resume recent matching jobs from the button when you return.
- Browser upload uses Fetch: this UI reports the current stage but not a fabricated per-byte upload percentage.
- Results in Backblaze B2 need explicit lifecycle/cleanup; results may otherwise persist. Configure appropriate temporary retention *before any external release*.

## Run and verify

1. Extract the ZIP into `D:\ai-media` (merge folders; none of the files should overwrite B3 files).
2. In `.env.local` you should already have `WORKER_JOBS_ENABLED=true`, `WORKER_UPLOADS_ENABLED=true`, `WORKER_EXECUTION_ENABLED=true` and valid `B2_*` credentials. **Never share this file or signed URLs.**
3. `bun test`, `bun run lint`, `bun run build`.
4. Start Docker Desktop and `bun run dev`.
5. While signed in, open:
   - `http://localhost:3000/tools/pdf/word-to-pdf`
   - `http://localhost:3000/tools/pdf/powerpoint-to-pdf`
   - `http://localhost:3000/tools/pdf/excel-to-pdf`
6. Choose one ordinary test file in the matching format (start with **sample.docx**, less than 25 MiB). Click **Upload securely**.
7. Success checkpoint: UI shows **Upload verified. Waiting for the local developer worker to run**. If 403/CORS, fix Backblaze S3 PUT policy rather than making the bucket public.
8. In a SECOND PowerShell terminal at `D:\ai-media`, with Docker Desktop running:

```powershell
bun --env-file=.env.local scripts/worker/run-once.mjs
```

9. Expected runner: `COMPLETED c...: ... PDF bytes`. The UI should eventually display **Converted PDF ready**. Click **Download PDF** and visually inspect the output.
10. Test failure, cancel, refresh/resume and 375px mobile layout. Repeat for PPTX and XLSX after DOCX succeeds.

**Important:** `run-once.mjs` handles the **oldest ready job** across all users, not necessarily the one currently displayed. If more than one ready job exists, execute the command again as needed. Do not process unknown user files. The runner is not production-ready.

## Release gate / after B4

- End-to-end DOCX, PPTX and XLSX functional QA including actual download + manual visual comparison.
- Add registry entries and adjust catalog count/tests only when the tools are truly ready to expose; do not mark these tools AVAILABLE while conversion still relies on a developer manually executing Docker.
- Next: hosted worker, transactional quota, retry/recovery/leases, malware screening, storage lifecycle and cleanup, failure-state polish and observability.

## Commit (only after QA)

```powershell
git status
bun test
bun run lint
bun run build
git add .
git commit -m "build Phase 19B4 Office to PDF upload and progress interface"
git push
```
