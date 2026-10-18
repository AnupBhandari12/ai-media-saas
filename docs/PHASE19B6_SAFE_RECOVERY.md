# AI Media — Phase 19B6: Safe LOCAL job inspection and manual recovery

**Scope**: developer-only, owner-scoped Office→PDF (`PDF-20/21/22`) job diagnosis and a deliberately manual terminal-state recovery step. Based on the user-supplied `phase19-review.zip` (Git commit `fef542e`). This does **not** automate retries and is **not** a hosted worker or Phase 19 release.

## 1. What changes?

New files ONLY:

- `lib/worker/recoveryRules.mjs` — pure 30-minute stale-job candidate criteria and guarded DB update conditions.
- `scripts/worker/recover-stuck.mjs` — read-only list by default; explicit, owner-scoped mark FAILED.
- `tests/tools/workerRecovery.test.js` — deterministic tests for owner, status, stage, timestamps, Docker safety.
- `docs/PHASE19B6_SAFE_RECOVERY.md` — this guide.

No existing source files, Prisma schema, migrations, `.env.local`, Backblaze objects, Vercel flags or main branch changed by installing these files.

## 2. Install and verify

From PowerShell in `D:\ai-media`, only when `git status` is clean:

```powershell
cd D:\ai-media
git status
Expand-Archive -Path "$HOME\Downloads\AI_Media_Phase19B6_Safe_Recovery_Patch.zip" -DestinationPath "D:\ai-media" -Force
bun test
bun run lint
bun run build
```

If the prior test count was 151, these eight tests should bring the number to 159, provided no other tests changed. The actual command output is authoritative.

## 3. Run a READ-ONLY report

Requires your existing local `.env.local` three worker flags, valid B2/Neon configuration, and `WORKER_DEV_OWNER_ID` configured for your own Clerk test user. Never paste credentials, URLs or `.env.local` in chat.

```powershell
bun --env-file=.env.local scripts/worker/recover-stuck.mjs
```

The report shows only PROCESSING Office jobs belonging to your Clerk test user, started **and** last updated at least 30 minutes ago. It does not reveal storage keys and does not make any database or B2 changes. A reported job is **potentially** interrupted, not proven crashed.

## 4. OPTIONAL manual closure (ONLY if a job is truly interrupted)

If the report shows a stuck job, first investigate whether it actually completed or uploaded a private result. Then:

1. Stop `scripts/worker/run-auto.mjs` with Ctrl+C and any other `run-once.mjs` processes. Ensure all of their terminal processes have really exited. **Do not run this while any worker script is active.**
2. Verify the job is older than 30 minutes and you own it.
3. Make sure Docker Desktop is running; the command refuses to act if the Docker daemon cannot be contacted or the job's named container exists.
4. Review possible B2 `results/<job>` or `verified/<job>` objects; the recovery command does not delete them. A stale job could have uploaded results just before a crash.
5. Only then issue:

```powershell
bun --env-file=.env.local scripts/worker/recover-stuck.mjs --mark-failed YOUR_REAL_JOB_ID --confirm-runners-stopped
```

Replace `YOUR_REAL_JOB_ID` with one reported job ID, e.g. a CUID beginning with `c`. The command performs an atomic guarded update: still your owner, still an Office job, still PROCESSING, still unchanged stage, still stale timestamps. It then marks that job FAILED so it no longer stays PROCESSING forever. **It does not re-run or retry the job.** To try again, upload a new test file as a new job. Your existing Phase 19B5 owner-scoped cleanup policy later handles known expired artifacts; unmatched B2 orphans still require retention management.

If there are NO stuck jobs, do NOT run the `--mark-failed` option. A no-jobs report is a valid QA outcome.

## 5. Tests/checks to run before Git commit

```powershell
bun test
bun run lint
bun run build
git --no-pager diff --check
git status
```

Docker end-to-end Office conversion is still needed for full Phase 19 functional sign-off. Tests here check pure rules, not Neon database behavior or the Docker API.

## 6. One commit after verification

```powershell
git add -- lib/worker/recoveryRules.mjs scripts/worker/recover-stuck.mjs tests/tools/workerRecovery.test.js docs/PHASE19B6_SAFE_RECOVERY.md
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "feat(worker): add safe local stuck job inspection and manual recovery"
git push origin fix/phase19-audit
git status
```

## 7. Intentionally NOT solved (Phase 19 remains incomplete)

- Automatic idempotent retry, durable leases, multi-host worker concurrency and crash-safe result reconciliation.
- Hosted Docker worker (current processor needs a running laptop, local paths and Docker Desktop).
- Browser integration for PDF-12/15/16; production B2 lifecycle/history expiration; malware screening; strict usage accounting and final human security QA.

Do not infer that this patch makes Phase 19 production ready. These are necessary later milestones. No new Neon branch or Prisma migration was made.
