# Phase 21 Paid AI Completion (requires separate review and approvals)

The Stage Kit makes practical LOCAL features available, but does not claim all roadmap AI operations work. The older 10A-10L backend work stays preserved with release gates OFF.

## Server-side Caption / Vision Alt Text

The prior `openaiProvider.mjs` uses an unverified placeholder `gpt-6-luna`; its pricing in `aiCostPolicy.mjs` is not authoritative. Do not enable the existing server provider until official model names, image API payload and actual price are checked, its handling of retries/usage is tested and the user explicitly approves spending. Do NOT set an API key yet on the basis of this kit. Alt text currently does not analyze images.

## AI Background Remover

No claim of real AI removal: Stage 04 supports simple browser-only color flood fill. Production paid removal requires approved provider, confirmed credit units, a trusted source image, a real atomic shared daily/monthly quota and provider pool reservation, verified transparent PNG output, B2 private persistence, exactly-one ledger entry and authenticated download. Its public removal button is intentionally disabled.

## Database and release

Existing `AiQuotaBucket` uses `limitValue`, not `limit`. `BgCreditBucket` and `BgCreditReservation` are NOT defined in the current Prisma schema. 10I fake adapter should never run against real Neon. Use an isolated new **empty** development/test database with explicit separate permission before adding migrations or performing real DB contention tests. Never attempt production migration without review, backup and approval. 10K release gate's `BLOCKED` outcome remains correct.

## After local UI test

Collect screenshot/test feedback from the three URLs. Then separately choose real provider(s) and an explicit spending ceiling. Prepare a new audited implementation against an isolated DB; complete integration and E2E tests, then user explicitly decides on enabling features. Roadmap Phase 21 remains IN PROGRESS until those acceptance criteria pass.
