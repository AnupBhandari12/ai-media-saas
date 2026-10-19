# Phase 21 / Stage06 — Background credit reservation

This stage adds an executable **transaction function** for the existing production Neon schema, **without invoking it from a route**. It creates no migrations, provider calls, external uploads, or credits. It does not modify `.env.local` or require new packages.

## Transaction design
- User's existing `AiQuotaBucket` `AI_ACTION` `MONTH` then `DAY` counters are debited exactly once — correct field `limitValue` (not `limit`).
- Vendor `BgCreditBucket` `POOL/remove.bg` `MONTH` then `DAY` counters are debited exactly once; separate `OWNER` vendor counters are NOT duplicated.
- `BgCreditReservation.requestId` is a database UUID unique key; an existing reservation is never dispatched or charged again.
- All changes are inside a single `Serializable` transaction with compare-and-swap row updates. Missing quotas, empty vendor budgets, conflicting updates or storage issues fail closed; no automatic retry.
- Only **verified internal preflight** with approved action may call the function. Passing browser JSON directly violates this contract.
- The return value **never** authorizes vendor dispatch. A later stage must implement source provenance, safe mark-dispatch, non-retry unknown-outcome logic, audit, output verification, and owner-only B2 access before enabling any background-removal route.

## Existing production database
The additive Stage05 migration `20261019232000_phase21_bg_credits_private_assets` remains a **separate operation**. Do not run migration from this kit. Inspect production backup and `prisma migrate status` first. Vendor POOL budgets default to zero; no credits are silently granted. We will not create another Neon project.

## Test scope
10 new tests use an injected rollback-capable in-memory Prisma adapter. They do **not** demonstrate real Neon concurrency or provider readiness. Full `bun test`, lint and build run on the user's machine before a local commit.
