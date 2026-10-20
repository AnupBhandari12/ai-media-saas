# AI Media — Phase 23 / Stage 07: Final Integration, UI Polish & Acceptance

## Scope and safety

This stage is a small, audited patch on top of commit `0f6b5e8` on branch `feat/phase23-ai-workspace`.
It does not add dependencies, schema changes, migrations, environment variables, paid AI calls or media processors.
It also does not push to GitHub, merge to main, or claim production readiness.

Stage 07 improves:

1. AI Workspace mobile and keyboard guidance: one-output hint, input character count, preview live region and updated page copy.
2. History UX: explicit refresh/retry, simple status filtering, clearer retention notice, readable controls on phones.
3. Post-mutation accuracy: successful Save / PATCH / DELETE use the server-confirmed result immediately instead of depending on a second GET. Incomplete acknowledgements show an uncertainty warning and request manual refresh rather than encouraging blind retries.
4. An automated **20-prompt acceptance matrix**: 10 exact canonical requests + 10 supported paraphrases; review gate and route/runner separation, invalid requests, owner-scoped history, and disabled-by-default paid planner.

## State and boundary diagram

```
Prompt -> free local intent -> PLAN or NEEDS_CLARIFICATION
                         PLAN -> explicit human review -> confirmation
                                      |
                            +---------+-------------+
                            |                       |
                         WF-06                 other 9 workflows
                  local file + Run          existing workflow page
                            |
                        browser result

Separate and optional: approved plan -> Save plan -> Clerk-owned history
                                     -> manual SAVED/IN_PROGRESS/DONE
                                     -> Delete / Refresh / Filter

Separate and gated: consent + server flags + budget -> paid text planner
```

The Save button **never** triggers image/PDF processing and is not proof that a job completed. A manually labeled `DONE` item does not update any ProcessingJob.

## Files in the patch

Updated (3):
- `app/(dashboard)/ai-workspace/page.js`
- `components/ai-workspace/AiWorkspaceUnderstanding.jsx`
- `components/ai-workspace/WorkspaceHistoryPanel.jsx`

New (2):
- `tests/ai-workspace/phase23Stage07.test.js`
- `docs/phase23/STAGE07_FINAL_INTEGRATION.md`

The ZIP installer checks the exact Stage 06 baseline SHA-256 for the three updated files; it refuses unrelated local edits. No `.env` or database connection is included.

## Verification (perform in order)

1. `bun test tests/ai-workspace/phase23Stage07.test.js` (new final acceptance suite)
2. `bun test tests/ai-workspace` (all Phase 23 stages)
3. `bun test` (full regression)
4. `bun run lint`
5. `bun run build`
6. Browser manual QA on `http://localhost:3000/ai-workspace`, desktop and narrow mobile viewport (~375px):
   - Test a canonical and paraphrased input for each of the 10 workflows; compare names and steps with existing workflow pages.
   - Ambiguous and unsupported prompts clarify rather than auto-selecting.
   - All ten plans require Review. Website Ready offers local Run only after acknowledge + image selection; the other nine open existing workflow pages.
   - History: save a non-sensitive prompt, filter by each status, change manual task label, refresh, reload, delete with confirmation, and recheck. Test empty/no-match states and narrow-screen horizontal overflow.
   - If possible, temporarily simulate history network failure in DevTools and verify error + Refresh history recovery. Do not use production DB deletion/reset commands.
   - Confirm no paid provider was called and no media was uploaded from history/preview.
7. Verify `git diff --check`, `git status -sb`, stage only intended files, then commit.

## Phase 23 acceptance, not Phase 24 launch certification

This is a source-level and developer-browser integration milestone, NOT independent production security/launch approval.
Defer to Phase 24: two-account cross-user negative integration tests, auth/CSRF/cookie verification under deployed origin, accessibility audits, PWA setup, responsive/full Lighthouse audit, retention/privacy policy, real deployment smoke tests, provider budget reconciliation, cleanup/recovery lifecycle, and final operational launch review. Paid AI remains operator-disabled unless deliberately enabled under existing guarded requirements. No real paid requests are required for Stage 07.
