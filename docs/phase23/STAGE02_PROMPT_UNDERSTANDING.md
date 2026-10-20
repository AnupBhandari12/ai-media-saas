# Phase 23 / Stage 02 — Prompt Understanding

## Purpose
Extend the Stage 01 **strict preview-only** workspace with a conservative offline English intent interpreter. This is *not* an LLM integration and does not execute tools, call providers, upload media, create jobs, use credits or save prompts.

## Files
- `lib/ai-workspace/interpretPrompt.js`: isolated deterministic intent matcher and guarded clarification.
- `components/ai-workspace/AiWorkspaceUnderstanding.jsx`: refreshed responsive UI, ten paraphrase examples.
- `scripts/phase23/add-stage02-prompt-understanding.mjs`: idempotent, guarded patch of the *existing* route.
- `tests/ai-workspace/phase23Stage02.test.js`: supported, ambiguous, malicious and unsupported text cases.

## Contract
1. Preserve all ten exact Stage 01 prompts and results.
2. Accept *one* explicitly recognizable destination for *one* approved image/notes branch.
3. Reject dual destinations rather than guessing or silently picking one.
4. Exclude video/reel/audio, OCR, PDF attachment operations and LinkedIn profile variants.
5. Reject unimplemented exact dimensions/file-size settings; do not pretend to apply them.
6. Reconstruct registered steps with `getWorkflowById` and verify them using `validateWorkspacePlan`.
7. Expose only `PREVIEW_ONLY`, `executable:false`, `requiresConfirmation:true`, `costUsd:0`.
8. No provider, shell, OS, upload, storage, database, or workflow execution calls.
9. Unknown, empty and >500-character prompts ask one clarification question.
10. This is only a first approximation to free-form text interpretation. It does **not** understand arbitrary Nepali or all English requests. Do not represent it as live AI.

## One-time integration and focused checks
```powershell
node scripts/phase23/add-stage02-prompt-understanding.mjs
bun test tests/ai-workspace/phase23Stage01.test.js tests/ai-workspace/phase23Stage02.test.js
```
After focused checks, run `bun test`, `bun run lint`, `bun run build`, manually check `/ai-workspace`, then stage and commit on `feat/phase23-ai-workspace`. Do **not** merge to `main` until Phase 23 is complete.

## Next stage
Stage 03 adds stricter validation and explicit user approval for actions, never letting text output directly invoke tools.
