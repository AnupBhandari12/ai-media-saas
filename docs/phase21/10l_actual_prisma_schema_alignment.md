# Phase 21 / 10L: Local Prisma model compatibility (READ ONLY)

Confirmed by owner's local PowerShell probe on 2026-10-19, HEAD `7b523da`:

- `AiQuotaBucket`: `ownerId`, `quotaKey`, `period`, `periodStart`, `used`, **`limitValue`** (not `limit`); compound unique `(ownerId, quotaKey, period, periodStart)`.
- `AiActionRequest`: `id`, `ownerId`, `idempotencyKey`, `inputHash`, `quotaCounted`, `quotaDayStart`, `quotaMonthStart`, **`dispatchedAt`**, `completedAt`; compound unique `(ownerId, idempotencyKey)`.
- `UsageEvent`: nullable unique **`aiActionRequestId`**, linked to existing `AiActionRequest`.
- `GeneratedAsset` and `ProcessingJob` have ownership and storage/job fields but NOT a verified background output hash-to-ledger provenance guarantee.
- Background-only pool/reservation models have **not** been added to live Prisma schema; SQL 10G is review-only and must never be executed automatically.

10I's legacy fake implementation incorrectly references `AiQuotaBucket.limit`. Keep it **quarantined**. `lib/ai/aiBackgroundRealSchemaContract.mjs` is an isolated source-field audit and Prisma conditional-update **argument preview**, not a replacement paid reservation implementation. It never writes to DB. Real runtime integration must use `limitValue` and safe server-resolved Clerk owner identity.

## Critical next steps before live processing

1. Validate actual Prisma schema against Neon on an isolated test branch/database using explicit permission; do not infer the deployed DB schema from schema text.
2. Design a **POOL-only** provider budget and reservation data model so `AiQuotaBucket` is the sole owner quota. Review Prisma relations, unique indexes, cost model and migration before applying to a non-production database.
3. Implement real SERIALIZABLE transaction, contention retries only before provider dispatch, and exactly-once idempotency/accounting.
4. Integrate durable private B2 storage, verified checksum, `UsageEvent`, `GeneratedAsset` and `ProcessingJob` updates in an audited lifecycle.
5. Verify provider pricing and credits, explicit approvals and unknown-result reconciliation; do not enable the remove.bg key, route or UI before all gates pass.

**No database connection, migration/write, paid API call, B2 operation or Git push is performed by this commit.** Source field match DOES NOT clear the 10K production release gate, which must stay BLOCKED.
