# Phase 23 — Stage 06: Opt-in History & Manual Task Tracking

## Contract

- Every signed-in user may **explicitly save** the current approved plan. No automatic conversation logging.
- Store only `prompt` (max 500 chars), registered `workflowId`, `variantId`, and manual task status.
- Do **not** persist media/file bytes, provider response, user-supplied steps, cost data or API keys.
- Real AI planning remains opt-in, paid planning disabled by default, and separate from this history.
- No job is executed by storing a plan, assigning `IN_PROGRESS`, marking `DONE`, opening a link, or deleting a record.
- The current user may list, self-label, and delete only their own records. No arbitrary user ID accepted from request data.
- Stage 06 history is separate from permanent Media/GeneratedAsset tables. Up to 30 records per user (beta soft cap; not a transactional concurrency quota).
- Browser history is displayed only after server-side Clerk auth; no-stored HTTP responses.

## Files

Stage 06 adds 9 new files (2 API routes, 1 UI component, 2 validation/HTTP helpers, migration SQL, test, installer and guide) and modifies 2 existing files via the installer:
`components/ai-workspace/AiWorkspaceUnderstanding.jsx`, `prisma/schema.prisma`.

## Database migration / configuration

Use the **existing DATABASE_URL** and **existing prisma7.config.ts**; do not share keys or `.env.local`.

Apply the included additive migration only after reviewing its SQL and verifying you have a safe database backup:

```
bunx --bun prisma migrate deploy --config prisma7.config.ts
bunx --bun prisma generate --config prisma7.config.ts
```

Do not use `prisma db push` or `migrate reset`. Migration creates only `WorkspaceHistory` and index.

## Stage testing

1. Installer run once, then a second time (must be no-op).
2. `bun test tests/ai-workspace` (Stage 01–06), then `bun test`.
3. `bun run lint` and `bun run build`.
4. Browser test: navigate AI Workspace, preview Website Ready, click `Save current plan` deliberately. Refresh and confirm the item persists. Mark `In progress`, refresh, mark `Done`, delete, refresh. Confirm no file was processed and no provider requests were made.
5. Production audit of cross-account ownership will happen in Phase 24. Existing owner-scoped WHERE clauses are tested in this stage but do not replace multi-user integration testing.

## Known bounds

- Statuses are manual, not real ProcessingJob statuses.
- Saved records do not include generated images/PDFs or copies of model content other than the *user's prompt*.
- The 30-item cap is best-effort; simultaneous requests could exceed it slightly.
- History is retained until user deletes it. A retention policy and privacy disclosure should be finalized before Phase 24 public launch.
