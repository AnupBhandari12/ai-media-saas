# AI Media — Phase 19B5: Local Office Worker Auto-Dispatch + Safe Retention Cleanup

**Reference:** AI Media Blueprint v2, Phase 19 (isolated worker, jobs surviving navigation, polling/callback, temporary-file cleanup, no client commands). This milestone is deliberately LOCAL-DEVELOPMENT ONLY and continues PDF-20/21/22 processing; PDF-12/15/16 remain CLI-only. It is not the complete hosted/production worker.

## Files

New:
- `lib/worker/maintenanceRules.mjs` — local-owner opt-in checks, retention policy and strict B2 key validation.
- `scripts/worker/run-auto.mjs` — 15s polling loop; one child worker at a time; Ctrl+C requests shutdown; on Windows the running child could also be interrupted, so inspect PROCESSING jobs before manual recovery.
- `scripts/worker/cleanup-once.mjs` — dry-run by default; bounded, owner-scoped deletion of stale temporary uploads and expired results.
- `scripts/worker/install-phase19b5.mjs` — safe, anchor-checked one-time patch for TWO existing files, with backups.
- `tests/tools/workerMaintenance.test.js` — deterministic safety, retention and key rules.
- `docs/PHASE19B5_AUTOMATION_CLEANUP.md` — this setup guide.

Modified by the installer (DO NOT overwrite yourself):
- `scripts/worker/run-once.mjs` — requires local Clerk owner scope; picks ready jobs from that owner only, from last 72h; atomic claim unchanged.
- `app/api/worker/jobs/[id]/download/route.js` — expired outputs return HTTP 410 after seven days rather than broken download links.

**No Prisma migration, Neon branches, B2 bucket-wide deletion, Vercel flag changes, registry availability changes, Docker image rebuild or secrets in Git.**

## 1. Merge ZIP, run installer, verify source changes

```powershell
cd D:\ai-media
git status
# Stop if unrelated changes exist. Back up or commit them first.
Expand-Archive -Path "$HOME\Downloads\AI_Media_Phase19B5_Automation_Cleanup_Patch.zip" -DestinationPath 'D:\ai-media' -Force
node scripts/worker/install-phase19b5.mjs
git --no-pager diff --stat
```

Installer fails closed if local code differs from its expected Phase 19B4 baseline. The originals are backed up to the ignored directory `worker/local-files/phase19b5-backups/`.

## 2. Local `.env.local` flags (NEVER share or commit)

Existing flags:
```
WORKER_JOBS_ENABLED=true
WORKER_UPLOADS_ENABLED=true
WORKER_EXECUTION_ENABLED=true
```

Add your own **Clerk development user ID** (`user_...`, from Clerk Dashboard -> Users -> your test user -> User ID). It is NOT your email or Neon database user.
```
WORKER_DEV_OWNER_ID=user_REPLACE_WITH_YOUR_OWN_CLERK_ID
WORKER_AUTO_DISPATCH_ENABLED=true
# Optional, set true only after reviewing dry-run cleanup and deciding to delete:
# WORKER_CLEANUP_ENABLED=true
```

Because you explicitly use a shared Neon database, owner scoping is critical; **do not** remove this restriction. You should never process another user's uploaded files with your laptop. The local runner will stop if an ID or required flag is missing.

## 3. Automated checks

```powershell
bun test
bun run lint
bun run build
```

If your previous baseline was 139 Bun passes and no other tests were added, this patch adds 12 tests, for an expected **151 pass / 0 fail**. Only an actual local run establishes success.

## 4. Opt-in automatic Office -> PDF (two terminals)

Start Docker Desktop. In terminal A:
```
bun run dev
```

In terminal B:
```
bun --env-file=.env.local scripts/worker/run-auto.mjs
```

Sign in as the exact Clerk user specified in `WORKER_DEV_OWNER_ID`; visit the developer-only `/tools/pdf/word-to-pdf` route, choose a NON-SENSITIVE test DOCX under 25 MiB and upload it. Auto worker notices jobs at most ~15 seconds after each previous run, converts privately through the existing isolated `run-once.mjs`, and the browser should show completion and allow PDF download. Test PPTX/XLSX with ordinary samples afterwards.

Stop terminal B with **Ctrl+C** preferably between jobs. If stopped mid-conversion, inspect PROCESSING state before manual recovery. It does NOT run automatically in future after laptop shutdown, nor does it run on Vercel. The worker does not retry failed jobs; a crashed PROCESSING job requires manual inspection/reconciliation. It ignores ready jobs older than 72h to avoid processing unexpectedly old uploads. A job submitted by a different Clerk user is ignored.

## 5. Safe cleanup (dry-run first)

No deletion:
```
bun --env-file=.env.local scripts/worker/cleanup-once.mjs
```

The dry-run shows job IDs and how many objects would be deleted. If the list includes anything unfamiliar, DO NOT APPLY. Only after you have checked those jobs, want deletion, and have necessary backups:

- add `WORKER_CLEANUP_ENABLED=true` in `.env.local`;
- then run:
```
bun --env-file=.env.local scripts/worker/cleanup-once.mjs --apply --confirm-owner-scoped-delete
```

Rules:
- `PENDING` reservations that never confirmed an upload expire after 72h **of creation and last update**. The job is marked FAILED via guarded update before its upload copy is removed.
- `PENDING/READY_FOR_PROCESSING` and `PROCESSING` jobs are never deleted automatically.
- `FAILED`, `CANCELLED`, `COMPLETED` jobs older than 72h may lose temporary `uploads/` and `verified/` references *for the selected dev owner only*.
- `COMPLETED` result PDFs expire 7 days after completion and authenticated download then returns 410 Gone. This is a proposed local retention policy, not a claim it was specified numerically by the roadmap.
- Strict object keys must match the job ID and generated UUID. No bucket-wide listing or deletes.
- Max 50 eligible jobs are inspected per run; invoke cleanup separately as necessary.

Important: Backblaze B2 object versioning means S3 `DeleteObject` may hide current versions rather than permanently remove all historic versions. The script DOES NOT configure lifecycle rules or permanently purge historic versions. Orphans not represented in ProcessingJob still need a carefully reviewed prefix-scoped Backblaze lifecycle policy. Do NOT overwrite bucket lifecycle settings without first reading existing rules. Official guidance: https://www.backblaze.com/docs/en/cloud-storage-lifecycle-rules

## 6. Commit once after local functional QA

```powershell
git status
git add -- lib/worker/maintenanceRules.mjs scripts/worker/run-auto.mjs scripts/worker/cleanup-once.mjs scripts/worker/install-phase19b5.mjs scripts/worker/run-once.mjs 'app/api/worker/jobs/[id]/download/route.js' tests/tools/workerMaintenance.test.js docs/PHASE19B5_AUTOMATION_CLEANUP.md
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "feat(worker): add owner-scoped local auto dispatch and retention preview"
git push origin fix/phase19-audit
git status
```

**Do not `git add .`**, do not commit .env.local or ignored `worker/local-files/`, do not merge this dev-only feature into a public release without a security review.

## 7. Remaining Phase 19 (not falsely marked complete)

Hosted worker deployment, durable lease/retry recovery and concurrency control, malware checks, B2 lifecycle rule for orphan/history purge, strict production quota accounting, storage streaming instead of full Node buffers, browser QA for PDF-12/15/16, verified PDF-20/21/22 end-to-end and human security tests. This patch is a focused development automation and optional retention step, not a production system.
