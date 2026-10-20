# Phase 23 — Stage 03: Plan Validation & Human Review

- Adds a second fail-closed check of preview data using the source-of-truth tool/workflow registries.
- Requires an explicit checkbox acknowledgment before showing the link to an existing approved workflow.
- No file processing, uploads, execution grant, token, provider calls, persistence, or quota mutation occurs.
- The user must still open an existing workflow and operate its own controls to process any file.
- An acknowledgment is **NOT** a security or spending permission; Stage 04 needs server-side enforcement and real orchestrator integration. A UI checkbox alone must never gate paid actions.
- Rejects unexpected keys, forged metadata, modified steps, unknown plan kinds, and execute/provider flags.

## Stage 03 verification
1. `node scripts/phase23/add-stage03-plan-review.mjs`
2. `bun test tests/ai-workspace/phase23Stage01.test.js tests/ai-workspace/phase23Stage02.test.js tests/ai-workspace/phase23Stage03.test.js`
3. `bun test`, `bun run lint`, `bun run build`
4. Browser: `/ai-workspace` — Preview safe plan -> checkbox -> Acknowledge plan -> Open approved workflow.
5. Negative: change prompt, the checkbox and receipt reset; no link without acknowledgment.

No new package, environment variable, or database migration.
