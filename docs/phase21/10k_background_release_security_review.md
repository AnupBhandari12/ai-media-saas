# AI Media SaaS — Phase 21 / Commit 10K: Offline Final Security QA

**Classification: SECURITY REVIEW ONLY / NOT LIVE / RELEASE BLOCKED.**

This closes the *offline foundation & mock-verification* segment of Commit 10A–10K,
**not** production background removal. Nothing in 10K connects to Neon, remove.bg,
Cloudinary, Backblaze B2 or public processing APIs; it neither pays nor writes.

## What is verified locally

- 10A–10J remain installed; a known set of provider, route, dispatch, storage and
  download flags are explicitly `false` (static/runtime import guard, not a full
  audit of every possible code path).
- New **26 release-gate tests** enforce a fail-closed, immutable `BLOCKED` verdict,
  including forged approvals, missing/malformed audits, absent quota limit,
  unknown processing route, and all disabled flags. A `BLOCKED` audit is a
  **successful security check**, not a system failure.
- New **13 offline image pipeline integration tests** use **real Sharp image
  decoding** and **fake in-memory provider PNG responses** for PNG/JPEG/WebP.
  10C/10D → 10E output decoding + validation → 10J private plan. These test
  invalid/mutated bytes, opacity, fully transparent outputs, owner mismatch and
  lack of download authorization. **No paid API call occurs.**
- Full Bun test suite + lint + build run before a single local commit.

## Production blockers — do not silently waive

1. `AiQuotaBucket` in current local Prisma does not match 10I's assumed
   `.limit` counter field. Inspect the actual Prisma model and live DB before
   choosing the correct schema API. Shared owner quota must be the *existing*
   `AI_ACTION` key; do not use 10G's old duplicate BG OWNER counters.
2. `BgCreditBucket` and `BgCreditReservation` are review-only schema proposals.
   The 10G SQL is not approved, not a migration, and must **not** be applied to
   the user's Neon production branch. Obtain an isolated test database/branch,
   map correct indexes and constraints, and explicitly approve any migration.
3. Verify a real multi-instance serializable transaction atomically updating
   the shared owner daily/monthly quota and the remove.bg POOL daily/monthly
   budget, with exact-once request ID and tested failure rollback.
4. Check remove.bg **actual** billing, API key, credit ceiling and fresh balance;
   require explicit owner/operator approval before any paid request. Stop on
   UNKNOWN outcomes: do not retry/refund blindly.
5. Complete durable dispatch lifecycle, provider receipt reconciliation,
   verified output storage and exactly-once `UsageEvent`/`ProcessingJob`/
   `GeneratedAsset` linkage. Fake DB tests cannot prove real Prisma behavior.
6. Implement owner-verified **private** B2 upload/checksum, retention policy,
   expired/unauthorized download rejection and private delivery. 10J planning
   helpers are **not** an upload or HTTP download route.
7. Only then develop guarded processing API, true before/after result UI and
   enabled Remove button, with negative tests, accessibility and browser E2E.
8. Review security and resource ceilings for multiple parallel requests on
   deployed hardware; 10H's local inspection requires opt-in and is NOT a
   background-removal endpoint.

## Guardrails for the next phase

- No blind database migrations against the existing Neon production branch.
- No B2/Cloudinary upload, real remove.bg dispatch, paid OpenAI call or other
  third-party spend without explicit user approval and test-environment QA.
- No `git push`, merge or unscoped `git add .` in the installer.
- Do not print `.env.local`, secret values, user-owned media or the full
  provider response body in logs.
- Preserve the previous local commit and untracked `.phase21-*` workspaces.

**Acceptance for Commit 10K:** 39 focused Bun tests pass; total test count
**599** (previous 560 + 39); lint/build pass; 10I audit prints `BLOCKED`;
10K audit prints `BLOCKED` and `ALL_KNOWN_SWITCHES_OFF`; local Git commit only.

**Do not describe 10K completion as live background removal.** Additional
implementation, schema approval and real provider/billing sign-off are required.
