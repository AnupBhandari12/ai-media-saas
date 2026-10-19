# Phase 21 — Local feature-complete release handoff

**Scope:** JavaScript / Next.js app; existing production Neon `neondb`, Clerk, OpenAI,
remove.bg, **private** Backblaze B2. **No new database, project, branch or vendor budget.**

## Local code delivered

- Local editable Caption templates, manual Alt Text, browser-only simple solid-background removal.
- Gated real Caption API and real Vision Alt Text API with global micro-USD application budget and quota tracking.
- Gated remove.bg transport, Sharp input validation, durable shared `AI_ACTION` and vendor POOL reservation,
  safe no-auto-retry state machine, verified private B2 PNG upload/download and owner-linked usage ledger.
- Stage 09 offline source audit, complete Bun tests, lint and Next.js build, documented Git main release process.

## Definitions (do NOT confuse)

**Local code complete:** Stage 09 test, lint, build, SHA/preflight, static audit, tracked-file commit pass.
**Main integration complete:** Merge is successful and `origin/main` push is confirmed.
**Paid production released:** Requires independent hosted env, vendor and storage checks PLUS real-provider E2E.
Stage 09 **does not** claim paid production release.

## Existing Neon: required manual migration status

1. Verify a recovery point for the **existing production** Neon project.
2. Review both additive SQL migration files:
   - `20261019232000_phase21_bg_credits_private_assets`
   - `20261019235900_phase21_bg_unique_usage_ledger`
3. Read-only: `bunx --bun prisma migrate status`.
4. If both pending, migration deploy is a separate deliberate production action:
   `bunx --bun prisma migrate deploy`. Do this **only** after reviewing SQL and recovery point.
5. Read-only: run `bunx --bun prisma migrate status` again; must be up to date before main release script.
6. Never use `prisma migrate dev`, `db push`, or `migrate reset` on production.

## Hosted safety flags

During Phase 21 main push keep gated paid/vendor/B2 feature flags **OFF in hosting** until
independent release sign-off. Local `.env.local` is not uploaded and is not proof of hosted settings.
Do not commit secrets, tokens or `.env.local`. No auto provisioning of budget or vendor credits.

## Unfinished live product release gates — explicitly deferred to Phase 24

- Actual remote B2 **bucket private ACL**, IAM/app-key least privilege, and 7-day **physical B2 object cleanup**.
  DB expiry already prevents app downloads after expiry, but does **not** delete objects.
- Production `BgCreditBucket` vendor POOL DAY/MONTH provision and live Neon concurrent reservation tests.
  Vendor credits are separate from the $0.10 OpenAI application budget.
- remove.bg paid provider result + real B2 write/read/download browser E2E with one approved credit.
- Hosted flags and user-facing consent review, mobile browser checks, monitoring, recovery for UNKNOWN outcomes,
  real API billing accuracy, data retention/legal/privacy.
- Live OpenAI caption and Vision behavior should be confirmed from real output logs without exposing sensitive content.

**Never claim full paid production readiness solely on the basis of 756+ passing offline tests.**

## Stage 09 workflow

A. Run `RUN_STAGE.ps1` to add offline audit and tests, and create a **local feature commit**.
B. Independently verify migrations/recovery point and hosted paid switches OFF.
C. Use `RELEASE_TO_MAIN.ps1` only after the checks; it fetches, fast-forwards, merges, and pushes
without force and stops on conflicts or failed checks. No schema migrations or API calls are made by the release script.
D. Record pushed `main` commit hash and use this handoff to begin Phase 22 tomorrow.

Existing Git stashes (`phase21-env-example-backup`, `phase21-vision-env-example-backup`) and untracked files stay untouched.
