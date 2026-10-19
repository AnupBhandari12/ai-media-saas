# Phase 21 / Commit 10I — Shared AI quota + remove.bg pool reconciliation (REVIEW ONLY)

## Problem observed in Commit 10H

The 10G proposed `BgCreditBucket` rows include both OWNER and POOL counters. Separate OWNER rows are **not proven to synchronize with** the existing `AiQuotaBucket` (`quotaKey = AI_ACTION`). A user might then have inconsistent per-day/per-month quotas across caption, alt text and background actions. Therefore paid dispatch **remains BLOCKED**.

## Proposed architecture (NOT migrated or enabled)

- **Shared user limits:** use existing `AiQuotaBucket` `AI_ACTION` for BOTH user DAY and MONTH. No duplicate BG OWNER counters.
- **Vendor spending limit:** use **POOL-only** `BgCreditBucket` rows for remove.bg DAY and MONTH. The pool is a local ceiling, **not** proof of actual vendor credits.
- **Durable identity:** a `BgCreditReservation` unique request UUID and fixed SHA-256. The old 10G review SQL describes a proposed table only.
- **Atomicity:** ONE `Serializable` transaction with a single request creation, two shared AI quota CAS updates and two vendor POOL CAS updates. On any failure, roll back all five changes. Month then day lock/update order.
- **Idempotency:** any existing UUID requires manual lookup/reconciliation, NEVER automatic second dispatch.
- **After dispatch:** timeout/uncertain provider outcomes hold credits and must not be retried automatically. A completed result still needs verified output storage AND an idempotent UsageEvent ledger transaction.
- **Paid provider:** disabled and not called by this commit. The 10I module is **never imported by an HTTP route**.

## Review blockers before production

1. Check actual feature-branch Prisma schema and database shape for `AiQuotaBucket` (field names/types: `ownerId`, `quotaKey`, `period`, `periodStart`, `used`, `limit`); static script lists what it sees but always prints `BLOCKED`.
2. Update/replace 10G's *proposed* SQL and add matching Prisma models with only operator-approved migration on an isolated database first; **do not apply old 10G SQL directly**.
3. Implement and validate real SQL/Prisma `Serializable` concurrency using an isolated Neon development database with two application instances. Fake DB serialization in this commit does NOT prove real PostgreSQL behavior.
4. Reconcile existing `AiActionRequest`/`UsageEvent`, especially `AI_ACTION` period debit/release and at-most-once successful ledger. Existing text-provider accounting must remain unaffected.
5. Document vendor plan, billing, credits, processing size ceiling, spend cap, replay policy, unknown-result reconciliation, verified output storage and retention.
6. Obtain explicit user permission BEFORE any real provider call, database migration or production enablement.

## Installer safety

`APPLY_10I.ps1` copies five **new** files, runs focused tests, full suite, lint, build and **read-only local source audit**, and creates a local Git commit only if all checks pass. No push, merge, migration, Neon connection, cloud upload, external HTTP, or provider API invocation. Existing files are not overwritten. Temporary `.phase21-*` folders are untouched.

**After this commit, `Remove` remains disabled. The audit being BLOCKED is EXPECTED.**
