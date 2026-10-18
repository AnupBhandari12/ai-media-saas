# AI Media Blueprint v2.0 — Phase 19B10 Free/Local Exit Audit

**Audit base:** `fix/phase19-audit` commit `6ef57f1` (PDF-30 added). **Scope:** Free/local development sign-off ONLY. Production Phase 19 contract still requires deployed isolated worker, signed jobs/secure queue, verified storage lifecycle, operational recovery, and security hardening. Paid infrastructure is intentionally deferred until final product launch (per user's decision).

## Files in this package

- `scripts/worker/audit-phase19-readonly.mjs` — new additive read-only structural inspection. It reads project files and Git metadata; it never reads `.env.local`, connects to Neon or B2, runs Docker, deletes files, runs git commit/push, or modifies source.
- `docs/PHASE19B10_FREE_LOCAL_EXIT_AUDIT.md` — this guide. No existing file is replaced.

### Step 1 — install without touching existing files

From `D:\ai-media` on `fix/phase19-audit` with a clean working tree:

```powershell
cd D:\ai-media
git status
Expand-Archive -Path "$HOME\Downloads\AI_Media_Phase19B10_Free_Local_Audit_Kit.zip" -DestinationPath 'D:\ai-media' -Force
git status
```

### Step 2 — automatic checks

```powershell
node scripts/worker/audit-phase19-readonly.mjs
bun test
bun run lint
bun run build
docker compose -f compose.worker.yml run --rm -T document-worker health
```

Expect 17 static checks PASS (the number output by the script is authoritative). Existing Bun baseline after PDF-30 is **177 tests**, assuming no other tests changed. Static inspection and helper tests do **not** prove the full security Definition of Done.

### Step 3 — LIVE manual review (non-sensitive samples ONLY)

- [ ] DOCX, PPTX and XLSX: upload -> verified -> automatic local worker -> completed -> private download -> inspect layout/slides/sheets. Verify each can resume after browser navigation.
- [ ] PDF-12: output remains readable, no exact size promise if target unmet.
- [ ] PDF-15: protected file requires password; no password in URL/logs.
- [ ] PDF-16: known password succeeds; wrong password returns failure and no downloadable PDF.
- [ ] PDF-30: valid source normalized; malformed/truncated input fails clearly; original stays unchanged.
- [ ] Disable case: in a fresh terminal run `node -e "import('./lib/worker/maintenanceRules.mjs').then(m=>{try{m.assertAutoDispatchEnabled({WORKER_JOBS_ENABLED:'false'});process.exit(1)}catch(e){console.log('PASS: worker disabled',e.message)}})"`. Also manually verify browser-local image/PDF tools still operate with worker services stopped. Do not edit shared env secrets merely for this check.
- [ ] Only your own Clerk user has access to your Office job status and download route; another signed-in test user must be denied (404/401), without exposing a signed URL. Verify never run another user's jobs locally.
- [ ] Docker container runtime inspected for network-off, read-only, per-job isolated mount; command injection and traversal inputs rejected.
- [ ] Local PDF bridge only listens on `127.0.0.1:4847`, wrong origin/token rejected. Stop bridge after QA; don't tunnel it.
- [ ] Responsive UI tested at 375px and desktop; download/error/progress states understandable.

### Step 4 — NO-DELETE storage/recovery report

```powershell
bun --env-file=.env.local scripts/worker/recover-stuck.mjs
bun --env-file=.env.local scripts/worker/cleanup-once.mjs
# Only list possible leftovers; do NOT auto-remove them:
Get-ChildItem '.\worker\local-files' -Directory -ErrorAction SilentlyContinue | Select-Object Name,LastWriteTime
# List active dev containers:
docker ps --filter 'name=ai-media-'
```

The recovery command is **read-only by default**. Cleanup command is **dry-run by default**. Do not run cleanup `--apply` or recovery `--mark-failed` without separately investigating exact jobs, stopping affected workers and explicitly authorizing the action. No tests can demonstrate true B2 version expiration without reviewing bucket lifecycle and sample object versions. Old B2 object versions/orphans remain a production release blocker.

### Step 5 — record exit status; do not assert full completion without evidence

| Acceptance item | Record PASS/FAIL/PENDING | Evidence to record |
|---|---|---|
| Read-only audit checks | | counts + failures |
| Bun tests, lint, Next build | | output totals |
| Worker-disabled no regression | | command + local tool smoke check |
| Docs/PPT/Excel live end-to-end | | own test files + outcome |
| PDF-12/15/16/30 local browser QA | | expected vs observed |
| Job navigation/resume | | result after reload |
| Owner-isolation / no injection | | negative tests |
| Cleanup dry-run and orphan review | | counts + observations |
| Actual retention deletion | **PENDING unless safely verified** | B2 versions/lifecycle proof |
| 24/7 hosted worker / durable leases / public-ready auth | **DEFERRED to launch** | hosting implementation plan |

The **full Phase 19 Definition of Done** is **not met** merely by an all-green static audit: cleanup after TTL, real isolation/security tests, signed durable jobs and hosted reliability remain separately verifiable launch gates. Keep registry worker tools COMING_SOON. Record exact deferred work so it is not forgotten when starting Phase 20 tomorrow.

### Step 6 — commit the additive audit documentation if all above checks pass

```powershell
git add -- scripts/worker/audit-phase19-readonly.mjs docs/PHASE19B10_FREE_LOCAL_EXIT_AUDIT.md
git --no-pager diff --cached --stat
git --no-pager diff --cached --check
git commit -m "test(worker): document Phase 19 free local exit audit"
git push origin fix/phase19-audit
git status
```

**Do not merge to `main` automatically.** Review the branch diff and production worker flags first. This kit neither changes existing source code nor enables any tool publicly.
