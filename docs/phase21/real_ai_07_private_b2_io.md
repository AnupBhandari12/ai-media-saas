# Phase21 — Stage07: private B2 PNG transport (standalone, not routed)

Stage06 (727 tests reported passing) added an atomic reservation against existing
`AI_ACTION` day/month quotas and the remove.bg vendor POOL. Stage07 adds server-only
Backblaze B2 transport and bounded output revalidation. It does **not** add an API
route, store a `BgStoredAsset` row, mint vendor credits, call remove.bg, add a
production migration, or authorize paid dispatch.

## Isolation and boundaries

- `lib/ai/realBgPrivateB2.mjs` uses the **existing** private B2 endpoint, bucket,
  key and AWS SDK. No new bucket/DB/branch is required.
- The factory does no network work at construction time. No HTTP route imports it.
- Private output path: `ai/background/private/<random UUIDv4>/<SHA256>.png`.
  Never include the owner's Clerk ID or a browser-supplied filename in keys.
- The upload helper only accepts plan/verified output tied to a `PROCESSING`
  background reservation with dispatched timestamp. In Stage08, all of these
  **must** come from the actual server pipeline / Neon, never request JSON.
- Uploaded output is verified via PUT, HEAD metadata/size, and bounded GET with
  SHA256. `STORED_VERIFIED_NEEDS_DB` means storage succeeded but **does not mean**
  a durable `BgStoredAsset`, ledger entry or completed job exists.
- Any post-dispatch B2 uncertainty remains `UNKNOWN_NO_AUTO_RETRY`; reconcile
  manually. No automatic vendor credits refunded or B2 overwrite attempted.
- A download is only eligible with owner-matching `BgStoredAsset`, `BgCreditReservation`
  and reconciled ledger proof. Stage08 must **query these from Neon using Clerk auth**
  and implement an exactly-once persisted ledger linkage before routing.
- Private reads return checksum-verified bytes *to server code*. No signed URLs,
  public URLs, browser-accessible object names or B2 credentials are returned.
- B2 lifecycle policy, private bucket permissions, retention/cleanup and billing
  caps are operator responsibilities. Existing B2 worker CORS is not used here.

## Feature switches (not added to .env.local)

The upload helper refuses all network work unless **both**
`AI_BG_PRIVATE_B2_WRITE_ENABLED=true` and
`AI_BG_PRIVATE_B2_OPERATOR_APPROVED=true`. The read helper is disabled unless
`AI_BG_PRIVATE_B2_READ_ENABLED=true`. Keep **all three unset/false** in Stage07.
The `B2_*` variables already used by `lib/worker/objectStorage.js` are reused.

## Remaining release blockers

1. Stage05 migration must be independently reviewed and applied to the
   **existing production Neon** after a verified recovery point. The installer
   never runs `prisma migrate deploy`.
2. Stage08 must verify `BgStoredAsset` exactly-once creation/commit,
   `BgCreditReservation` lifecycle, actual `UsageEvent` linkage, status and
   ownership in Neon before delivering data.
3. Stage08 must connect a guarded remove.bg route, test real provider credit
   behavior only within separately approved remove.bg limits, and add owner-only
   download route and browser UI.
4. Final tests: concurrency, failure recovery, expiry, MIME/header, mobile,
   retention, storage permissions, privacy, billing and authenticated E2E.

## Local stage test

```powershell
bun test tests/ai/realBgPrivateB2.test.js
bun test
bun run lint
bun run build
```

The kit installer runs these before making one **local-only** commit. **Do not
rerun if it stopped after copying files**; send the output instead. Keep any
`.env.example` stash intact; do not pop it automatically. No push or merge.
