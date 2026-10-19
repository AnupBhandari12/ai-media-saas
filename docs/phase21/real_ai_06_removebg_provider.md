# Stage 06 - remove.bg provider: still BLOCKED

Official service: https://www.remove.bg/api . Low-res previews (up to 0.25MP) have 50 free API calls/month according to the provider; do not infer unrestricted full-resolution credits. The current code has `aiRemoveBgProvider.mjs`, `aiBackgroundOutput.mjs`, `aiBackgroundPrivateArtifact.mjs` and a review-only reservation prototype. IMPORTANT `aiBackgroundSharedQuotaReview.mjs` references legacy `bucket.limit` instead of actual `AiQuotaBucket.limitValue` and uses missing Bg models; never call it on live Neon.

A future release must use real database-backed per-owner shared quota + vendor pool reservation in the same transaction, actual credit accounting, private output persistence, exactly-one UsageEvent, no retry on unknown, user + operator approval.
