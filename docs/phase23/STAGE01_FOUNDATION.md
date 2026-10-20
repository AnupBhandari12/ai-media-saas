# Phase 23 — Stage 01: AI Workspace guarded foundation

Source: AI Media Complete Product Blueprint & Roadmap v2.0, Phase 23, page 80.

## This stage
- Adds `/ai-workspace` inside the existing Clerk-protected dashboard layout.
- Ten canonical example phrases map to the already-registered Phase 22 workflows.
- Builds a **read-only**, frozen, tool-registry-validated, exact-step plan.
- Unknown or ambiguous input asks one clarification; it does not guess.
- Desktop sidebar and mobile menu links use an idempotent installer.
- No AI API, credentials, background requests, file processing, quota mutation, new DB tables, or packages.

## Important limitations
- This is not yet a general natural-language AI assistant: **only exact example phrases** are recognized.
- `validateWorkspacePlan` checks the registered IDs and steps; later stages also validate per-step *settings*, costs, quota, files, ownership and server policy before execution.
- Every plan is `PREVIEW_ONLY`, `executable: false`, and requires confirmation.
- The Stage 01 UI links to current workflow betas; it does not run them.
- AI-generated interpretations, human confirmation, runtime adapters, optional task history and quota enforcement are later milestones.

## Installation and testing
1. Extract ZIP and copy only `stages/01` content into the feature branch; stop if existing destinations collide.
2. `node scripts/phase23/add-stage01-navigation.mjs`
3. `bun test tests/ai-workspace/phase23Stage01.test.js`
4. `bun test` ; `bun run lint` ; `bun run build`
5. `bun run dev` -> `/ai-workspace`; choose examples, preview plans, try unknown text; check mobile menu.
6. Review `git status -sb`, staged diff, and commit only this stage after passing checks.

## Next stages
Interpretation => tool/settings validation and confirmation => bounded dispatcher => live provider path => optional history => integration and 10-prompt acceptance checks. Global launch/performance audit deferred to Phase 24.
