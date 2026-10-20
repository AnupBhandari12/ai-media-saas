# Phase 23 Stage 04 — browser-local Workflow Execution pilot

Scope: After a fresh Stage 03 review and explicit acknowledgment, the AI Workspace
can execute **WF-06 Website Ready image** *in the AI Workspace* using the already
implemented Phase 22 `runWebsiteReady()` runner. The other nine approved variants
remain accessible using their normal Workflow pages; they do not execute inside
AI Workspace in this stage. This distinction is intentional.

## Guarded flow

1. Browser parses the English prompt using Stage 02 deterministic rules.
2. Stage 03 strictly revalidates the registered workflow step list and receives
   user acknowledgement. This is not a server authorization boundary.
3. Stage 04 shows the local-run panel **only** for the approved WF-06 image variant.
4. User explicitly selects a JPG/PNG/WebP file up to 10MB, sees locked
   default settings (1600px long side, 400 KB target, WebP output), and clicks Run.
5. The runner executes approved Phase 22 operations (IMG-03, IMG-05, IMG-14,
   IMG-02) in the browser. Cancellation, per-step progress, error and
   download are controlled in the UI.
6. No upload, provider API request, AI call, quota reservation, or database write
   is added. The file and output exist only in browser memory until downloaded.

## Security limitations and exit scope

- The Stage 03 checkbox is UX review, not trusted auth or a quota bypass token.
- The Phase 22 runner checks inputs and tool dependencies again before doing work.
- The Workspace bridge revalidates plan structure and expected runner result.
- This stage does NOT permit arbitrary LLM tool calling or remote media execution.
- Stage 05 adds real AI interpretation behind server authorization and quota gates;
  ensure AI cannot pass commands or options into this local execution bridge.
- Browser UX cannot replace server-side authorization for future paid actions.

## Install

- Requires a clean `feat/phase23-ai-workspace` branch after Stage 03 commit.
- Copy only five NEW files under `stages/04` (reject destination collisions).
- Run `node scripts/phase23/add-stage04-local-execution.mjs`.
- Run `bun test tests/ai-workspace/phase23Stage01.test.js tests/ai-workspace/phase23Stage02.test.js tests/ai-workspace/phase23Stage03.test.js tests/ai-workspace/phase23Stage04.test.js`.
- Then run full tests, lint, build, browser QA, and commit separately.

## Manual browser checks

1. `/ai-workspace` → 'Optimize this image for my website' → preview.
2. Without checking Review the execution panel should not appear.
3. Acknowledge → WF-06: see local upload and run controls; run small photo.
4. Verify per-step progress, WebP download (inspect output file), Cancel handling.
5. Switch to 'Make this photo WhatsApp ready': NO in-workspace local-run panel;
   existing workflow page link works.
6. Malformed/unsupported text must give one clarification with no execution.
7. New prompt must not inherit a previous plan acknowledgement.

Stage 04 does not finish the Phase 23 AI provider or history work.
