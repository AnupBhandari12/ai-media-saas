# Phase21 — Stage05: real background DB schema (NOT applied)

This stage adds **only** three Prisma models and an additive SQL migration:

- `BgCreditBucket`: owner and vendor-pool daily/monthly committed credits. `ceiling = 0` by default.
- `BgCreditReservation`: unique UUID, image SHA, owner, conservative status and one-credit reservation.
- `BgStoredAsset`: future private B2 result bound by unique request ID, original/output hashes and expiry.

It DOES NOT connect any API route, charge remove.bg credits, populate a vendor pool, upload to B2, run migration, expose private keys, or approve production release.

On the EXISTING Neon production database, apply only after reviewing a backup/recovery point and validating the exact SQL. Do not use `prisma db push`, `prisma migrate reset`, or `prisma migrate dev`. Migration deployment requires a **separate operator decision**; the installer does not run it.

Further work: single-transaction shared AI quota + owner/pool credit counters; explicit provider credit allowance; verified output and B2 persistence with independent checksum validation; owner-only route; manual browser/credit-accounting QA; reconciliation for UNKNOWN vendor outcomes.
