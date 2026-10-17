# AI Media — Phase 19B3: local Office worker execution

**Scope:** trusted developer PC, one job per manual invocation, using existing Neon `ProcessingJob`, existing private Backblaze B2 bucket, and Phase 19A Docker image. Production dispatch, durable queue lease/retries, cloud worker hosting, malware scanning, file lifecycle and responsive UI are **not** implemented. Keep all relevant Vercel production flags disabled. Do not process sensitive customer documents.

## Important: Phase 19B2 must really have succeeded

CORS being saved or ZIP/tests passing is NOT proof of an actual upload. In your local signed-in web browser, run the real DOCX/PPTX/XLSX upload flow in `docs/PHASE19B2_SETUP.md` under **Upload test (browser DevTools > Console)**. It must log `VERIFIED`, `PENDING`, `READY_FOR_PROCESSING`. Only then can B3 execute a job. If browser PUT fails with CORS, the Backblaze GUI's simple one-origin sharing preset may not cover `s3_put`. Configure a custom private-bucket S3 CORS rule allowing `PUT` from `http://localhost:3000` and the `Content-Type` header; do not make bucket public. Refer to Backblaze's S3-compatible PutBucketCors documentation. Keep `WORKER_UPLOADS_ENABLED` off in hosted environments.

## Add/replace exactly these 6 files

New:
- `lib/worker/executionRules.js`
- `scripts/worker/run-once.mjs`
- `app/api/worker/jobs/[id]/download/route.js`
- `tests/tools/workerExecution.test.js`
- `docs/PHASE19B3_SETUP.md`

Replace only:
- `lib/worker/objectStorage.js` (preserves B2 upload functions and adds get verified bytes, private PDF output and presigned download)

Do not replace Phase 19B2 upload/confirm/cancel routes, database schema, or worker Dockerfile.

## Environment (local .env.local ONLY)

Existing Backblaze settings remain:
```
WORKER_JOBS_ENABLED=true
WORKER_UPLOADS_ENABLED=true
B2_ENDPOINT=https://s3.us-east-005.backblazeb2.com
B2_REGION=us-east-005
B2_BUCKET_NAME=ai-media-temp-documents
B2_KEY_ID=your_private_access_key_id
B2_APPLICATION_KEY=your_private_secret_key
```
Add:
```
WORKER_EXECUTION_ENABLED=true
```
Existing `DATABASE_URL_POOLED` must be set. Never paste any env file or presigned URL in chat; do not commit it.

## Tests and run

From `D:\ai-media` in PowerShell:

```powershell
bun test
bun run lint
bun run build
# Confirm already-built image is available (no rebuild necessary):
docker image inspect ai-media-document-worker:latest
# Verify a real B2-confirmed PENDING/READY_FOR_PROCESSING job exists first.
bun --env-file=.env.local scripts/worker/run-once.mjs
```

Expected when ready job exists:
```
Processing job c... with isolated Docker container.
COMPLETED c...: <bytes> PDF bytes. Download via authenticated job route.
```

Expected when no job ready:
```
No ready document jobs found; nothing executed.
```

The runner processes **at most one** oldest ready job per execution. It claims status `PROCESSING` atomically, downloads the private verified input to an ignored per-job local folder, starts a network-disabled Docker container with ONLY that job folder mounted, checks output PDF, stores it in private B2 `results/`, marks `COMPLETED` and removes local files. It never sends B2/Neon credentials into the container.

## Test job status and download in your signed-in browser console

Use the `jobId` of the confirmed reservation created in Phase 19B2. Do not confuse `created` objects from different console sessions.

```js
const jobId = 'PASTE_YOUR_TEST_JOB_ID_HERE';
const statusResponse = await fetch(`/api/worker/jobs/${jobId}`);
console.log(statusResponse.status, await statusResponse.json());

const response = await fetch(`/api/worker/jobs/${jobId}/download`);
const result = await response.json();
console.log(response.status, { filename: result.filename, expiresIn: result.expiresIn, error: result.error });
if (response.ok) window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
```

Expect `status: COMPLETED`, `progress:100`. Download route returns an ephemeral private presigned URL; **do not screenshot, commit or paste that URL**.

## Security/QA limitations

- The local runner is NOT an always-on multi-instance production dispatcher.
- If your computer crashes after claim, a job may remain in `PROCESSING`. Do not auto-retry or reset it without reconciling remote output and storage.
- B1 reservation caps are not transactionally strict; usage metering is best-effort in this development batch. Real financial quota enforcement remains for later.
- Office signature is only header-level; the document might still contain malicious content. Docker does not make parsing arbitrary documents risk-free. Keep this a private development feature.
- Use only non-sensitive test documents. Configure automatic Backblaze lifecycle cleanup for `uploads/`, `verified/`, and `results/` before accepting real users. Result expiration and failure states will need to be shown in the B4 UI.
- Download URL is a bearer credential with ~90-second expiry; users need to request a new one when expired.
- A status of COMPLETE is not enough for production launch: verify actual converted PDF layout manually for DOCX, PPTX, XLSX.
- PDF-20/21/22 registry status must remain COMING_SOON until Phase 19B4 UI and end-to-end QA pass.

## Commit only after tests and manual conversion pass

```powershell
git status
# Confirm secrets and worker/local-files are excluded.
git add .
git commit -m "build Phase 19B3 local document job execution and private results"
git push
```

Next: Phase 19B4 professional upload/progress/result UI; then dedicated hosted worker, robust queue, retention/cleanup, and worker safety hardening before actual launch.
