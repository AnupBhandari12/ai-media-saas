# Phase 23 Stage 05 — Optional real AI prompt interpreter (paid path off by default)

This stage adds an optional **text-only** model interpreter for the AI Workspace.
Local deterministic plan previews and existing browser processing remain unchanged.
The model returns only an enum workflow choice or one clarification question.
**It does not provide tool IDs, runnable settings, URLs, shell commands, or execution permission.**
The server reconstructs an immutable `PREVIEW_ONLY` plan from the canonical registry.

## Installation

1. Extract Stage 05 files, check that all 8 target paths are absent and copy *only* those eight new files.
2. `node scripts/phase23/add-stage05-real-planner.mjs` (updates seven existing files; repeatable).
3. `bun test tests/ai-workspace/phase23Stage01.test.js tests/ai-workspace/phase23Stage02.test.js tests/ai-workspace/phase23Stage03.test.js tests/ai-workspace/phase23Stage04.test.js tests/ai-workspace/phase23Stage05.test.js`
4. `bun test`; `bun run lint`; `bun run build`.
5. Browser-check `/ai-workspace` in its **default off** configuration. The deterministic path still works, the AI panel displays disabled status; no provider calls or quota consumption.
6. Commit only explicitly reviewed Stage 05 files. Do not push or merge until Phase 23 is done.

## Real provider enablement — NOT part of this Stage's default browser QA

**Do NOT add credentials or change budget from chat instructions without operator review.**
The paid route is disabled by default. It requires **all**:

- Authenticated Clerk user and same-origin, bounded JSON request;
- `AI_WORKSPACE_PLANNER_ENABLED=true` (server env only), **AND** `AI_REAL_SPEND_APPROVED=true`;
- Valid server-only `OPENAI_API_KEY`, deployed separately;
- existing per-owner/day and per-owner/month transactional `AI_ACTION` reservation;
- an approved **nonzero** `AiGlobalBudget` ceiling with available headroom (absent/zero denies);
- one server-fixed $0.003 commitment per **new** workspace planning request (`WORKSPACE_PLAN`), never set by client;
- explicit separate user checkbox and click for prompt-text transfer;
- one UUID idempotency identity per attempt; no automatic retry of charged or uncertain outcomes.

Global budget commitments are conservative upper bounds; they are not provider billing limits.
A provider/account hard spend cap must be configured independently. No rate-limiter or cost policy guarantees prevention of all provider charges; audit usage and fail closed if unknown.
Actual token cost is estimated using Phase 21 `gpt-6-luna` pricing and must be reviewed before paid activation.

For a stage with **no paid test**, do not claim live real AI verified. A separately approved small-budget test can be done later, with redacted logs, billing/bucket reconciliation, and rollback first.

## Files copied

- `lib/ai-workspace/realPlannerContract.js` — strict model suggestion validation & preflight.
- `lib/ai-workspace/realPlannerTransport.mjs` — server-only structured Responses API contract.
- `lib/ai-workspace/runRealWorkspacePlanner.mjs` — existing quota/budget lifecycle wrapper.
- `app/api/ai-workspace/planner/route.js` — Clerk-protected, same-origin, default-off endpoint.
- `components/ai-workspace/WorkspaceAiPlannerPanel.jsx` — user checkbox & explicit AI button.
- `scripts/phase23/add-stage05-real-planner.mjs` — safe installer of existing files.
- `tests/ai-workspace/phase23Stage05.test.js` — focused tests.
- `docs/phase23/STAGE05_REAL_AI_INTEGRATION.md` — this handoff.

## Existing files updated by installer

- `lib/ai/aiReservationIdentity.mjs` and `lib/ai/aiQuotaReservation.mjs`: new `WORKSPACE_PLAN` action (not mislabeled as CAPTION).
- `lib/ai/realAiGlobalBudget.mjs`: fixed $0.003 reservation for each planner request.
- `lib/ai-workspace/reviewGate.js`: recognize `MODEL_SUGGESTION` without allowing arbitrary steps.
- `components/ai-workspace/AiWorkspaceUnderstanding.jsx`: optional text-only AI panel.
- `components/ai-workspace/WorkspacePlanReview.jsx`: accurate paid-vs-free copy.
- `app/(dashboard)/ai-workspace/page.js`: server-only feature gate; disabled by default.

No new NPM/Bun packages and **no DB migrations**: Prisma action is already a string.

## Known restrictions

- Stage 05 enables **only prompt interpretation** when deliberately turned on, not video tools, unsafe media execution, publishing, uploading, or complex custom steps.
- Website Ready remains the sole in-workspace browser-local executor; the other nine use their existing pages.
- No history UI yet (Stage 06). Ledger stores provider results for accounting, not conversation history.
- A deterministic unsupported prompt is rejected before spending. A provider-invalid/uncertain result retains reserved quota/cost; no auto-retry.
- The client uses `Content-Length` with same-origin browser requests. If the upstream proxy strips this header, requests fail closed; investigate rather than weakening guards.
