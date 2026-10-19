# Phase 21 / Commit 10J — Private Artifact Storage Review (NO UPLOAD)

## Purpose

The output verifier in 10E returns a sanitized, transparent PNG in memory. The
10I owner+vendor credit reservation is a **fake-database prototype**, not a
production reservation. This commit defines a pure storage plan and owner-only
eligibility review for a future safe output workflow. No code in this commit
connects to any public route, Backblaze B2, Prisma, Neon or remove.bg.

### Safe intended future flow (not implemented as a live workflow)

1. Clerk-authenticate request, fully decode source (10C/10D) and verify 10F preflight.
2. Use a *reviewed* Prisma schema and an atomically reconciled shared AI_ACTION
   owner quota + remove.bg POOL budget, verified in an isolated database.
3. Record dispatch intent before the paid call. Never auto-retry ambiguous outcomes.
4. Validate response with **10E's real Sharp PNG verifier**. Passing 10J's
   structural verification *by itself* does not prove an image is valid. Never
   feed HTTP JSON to `planBackgroundPrivateArtifact`.
5. Create a new, non-user-derived private B2 object key. A storage plan **never
   uploads bytes**. In a future gated implementation, write to private B2,
   verify checksum/ETag as applicable, and atomically finalize the asset +
   exact-once UsageEvent ledger.
6. Download authorization must reload asset and job from the database,
   match authenticated owner and verified sha256, require completed ledger,
   reject expired assets, and stream privately with `Content-Disposition` and
   no-store headers. Never return raw object keys or public URLs to the client.
7. Reconcile failure/UNKNOWN cases and delete orphaned outputs only under
   separately tested retention policies. Preserve the source unchanged.

### Remaining blockers

- `AiQuotaBucket` does **not** expose a `limit` field matching 10I's fake DB
  prototype. Review actual Prisma field names and existing migration before
  writing a real Prisma adapter. Never silently create a duplicate owner quota.
- `BgCreditBucket` and `BgCreditReservation` are only review-only designs.
- `GeneratedAsset` has storage fields but no proven immutable output hash,
  provider receipt, background reservation FK or exact-once ledger binding.
  Future schema design must reconcile with existing `ProcessingJob`/`UsageEvent`.
- No separate Neon test branch has been verified; no production migration
  should be run based on this file or old 10G review SQL.
- No real remove.bg billing, dispatch, output storage or production concurrency
  tests have been performed. No live button activation is authorized.

### Security note

Both `planBackgroundPrivateArtifact` and `reviewBackgroundPrivateDownload` are
pure offline helpers. `reviewBackgroundPrivateDownload` **never authorizes** an
HTTP response or returns a signed URL, even for otherwise eligible records.
The 29 contract tests use **inert fake PNG header bytes** to verify helper
shape and hashing; they do not substitute for 10E real image decoding.

**Current state: PROVIDER DISABLED / STORAGE DISABLED / DOWNLOAD ROUTE DISABLED.**
