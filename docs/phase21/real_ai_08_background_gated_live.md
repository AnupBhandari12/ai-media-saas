# Phase 21 — Stage08: Gated remove.bg orchestration + owner-only B2 downloads

**Baseline (user-confirmed):** Stage07 742 tests passed and local commit
`feat(ai): add isolated private B2 PNG IO with integrity checks`.

This installs a guarded remove.bg POST route, a verified-private PNG download route,
owner-scoped persistent `BgStoredAsset`, a unique `UsageEvent` link, and a separate
opt-in beta UI. It reuses the **same existing production Neon database, Clerk,
private Backblaze B2 bucket, remove.bg adapter and existing shared `AI_ACTION`
quota. No new Neon project/branch/database.

## Security by default

- **Everything remains OFF.** This installer does **not** run any Prisma migration,
  modify `.env.local`, provision `BgCreditBucket` rows, call/remove.bg, access B2,
  create an external bill, push/merge, pop stashes or touch existing data.
- POST requires authenticated Clerk identity, same-origin multipart request,
  signed-off checkbox, server decode and 2MB / 4MP beta intake bounds.
- Server reserves shared quota & vendor POOL day/month using Stage06 serializable
  transaction; any exhausted/missing cap denies paid dispatch.
- Dispatcher marks `PROCESSING` before provider call. Ambiguous provider/verification,
  storage or DB completion is `UNKNOWN_NO_AUTO_RETRY`; no blind refund/retry.
- Verified PNG only → private B2 PUT+HEAD+GET hash → exactly-one
  `BgStoredAsset` and `UsageEvent` linked by unique requestId in a transaction.
- Download uses Clerk identity and DB-fetched reservation/asset/ledger proof,
  verifies B2 SHA, returns `private, no-store` attachment and no public URL.
- Stage08 adds **an additive follow-up migration** to `UsageEvent` so one usage event
  can be bound to each background-removal UUID. Requires Stage05 migration first.

## Actual release is NOT approved by installing this kit

The following require operator review, a verified recovery point, and separately
controlled approval:

1. `bunx --bun prisma migrate status` on the **existing** Neon project. Stage05
   and Stage08 migration SQL must be reviewed before `migrate deploy`; the installer
   does NOT execute it. Never `migrate dev`, `db push`, or `migrate reset` on production.
2. Verify authenticated real database concurrency, existing `AiQuotaBucket` DAY/MONTH
   provision, current UTC `BgCreditBucket` POOL rows. **No auto-funding.** Confirm
   fresh remove.bg account credits & a finite allowed credit count. OpenAI's separate
   $0.10 application budget does not cover remove.bg credits.
3. Review private B2 bucket policy, endpoint, retention (the result expires after
   seven days in DB; physical object cleanup policy is a Stage09 QA/retention task),
   and accurate B2 key permissions. Never turn B2 bucket public.
4. After independent DB/credit/config confirmation, set operator-controlled server
   env only for the intended local beta:

```dotenv
# All OFF until the manual release gate confirms readiness
AI_BG_REAL_ENABLED=false
AI_BG_REAL_SPEND_APPROVED=false
AI_BG_PRIVATE_B2_WRITE_ENABLED=false
AI_BG_PRIVATE_B2_OPERATOR_APPROVED=false
AI_BG_PRIVATE_B2_READ_ENABLED=false
# REMOVE_BG_API_KEY=<secret, never share or commit>
# B2_* existing private credentials, never share or commit
```

Switching them to true could cause billable remove.bg calls. **Do not enable now.**
The `AI_BG_PRIVATE_B2_READ_ENABLED` flag only authorizes reads; write/use further
require all four other switches, provider key and server-side quota/credit rows.

## Local installation (no migration, no vendor calls)

```powershell
cd D:\ai-media
Expand-Archive -LiteralPath "$HOME\Downloads\AI_Media_Phase21_BG_Stage08_Kit.zip" -DestinationPath "$HOME\Downloads\Phase21BgStage08" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$HOME\Downloads\Phase21BgStage08\RUN_STAGE.ps1" -Stage 08 -ProjectRoot "D:\ai-media"
```

Preflight requires Stage07 local commit and **no existing tracked modifications**.
Never blindly rerun after any file has been copied: send console output for targeted
recovery. No git clean/reset; no stash pop. Last step creates one **local commit**.

Expected on user laptop: 756 tests / 0 failures, ESLint PASS, build PASS.
14 Stage08 isolated tests passed on this kit's source under Node 22. Full Bun and
Next.js checks have to pass on the user's development machine. Actual paid,
database concurrency, B2 bucket ACL and browser tests remain Stage09 release gates.
